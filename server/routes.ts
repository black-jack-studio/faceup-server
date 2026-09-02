import type { Express } from "express";
import { storage, getParisDateKey, getNextParisMidnight, DOUBLE_REWARD_AD_DAILY_LIMIT } from "./storage";
import { insertUserSchema, insertGameStatsSchema, insertInventorySchema, insertDailySpinSchema, insertBattlePassRewardSchema, dailySpins, claimBattlePassTierSchema, selectCardBackSchema, insertBetDraftSchema, betPrepareSchema, betCommitSchema, users, betDrafts, activeGames, submitReferralCodeSchema } from "@shared/schema";
import { ServerBlackjackEngine, type Card } from "./BlackjackEngine";
import { simulateWinProbability } from "./handStrength";
import type { PlayerHand, GameAction, BlackjackMode } from "@shared/blackjack-types";
import { db } from "./db";
import { eq, and, gte, sql } from "drizzle-orm";
import { EconomyManager } from "../client/src/lib/economy";
import { CHEST_TIERS, chestCostFor } from "../shared/chestCatalog";
import { ChallengeService, CHALLENGE_XP_REWARD } from "./challengeService";
import { SeasonService } from "./seasonService";
import bcrypt from "bcrypt";
import { sessionMiddleware } from "./session";
import { randomBytes, createHash } from "crypto";
import { validateReferralCode, canEnterReferralCode } from "./utils/referral";
import { REFEREE_SIGNUP_REWARD_COINS } from "./utils/referral-rewards";
import { ALLOWED_ORIGINS } from "../config/env";
import { getRankDefinition } from "@shared/ranks";
import { avatarCostFor } from "@shared/avatarCatalog";
import { verifyAppleIdentityToken, generateUniqueUsernameFromEmail } from "./utils/apple-auth";
import { sendVerificationEmail, sendPasswordResetCodeEmail } from "./email";
import { broadcastTableUpdate, broadcastEmote } from "./websocket";
import { computeHandPayout, redactDealerHand, computeLegalActions, settleHandsAgainstDealer } from "./blackjackSettlement";
import { sendPushNotification } from "./utils/apns";

// Helper function to apply spin rewards atomically
async function applySpinReward(userId: string, reward: any, includeInventoryItems: boolean = true): Promise<void> {
  const user = await storage.getUser(userId);
  if (!user) return;

  const updates: any = {};

  switch (reward.type) {
    case 'coins':
      updates.coins = (user.coins || 0) + reward.amount!;
      break;
    case 'gems':
      updates.gems = (user.gems || 0) + reward.amount!;
      break;
    case 'swapTokens':
      updates.swapTokens = (user.swapTokens || 0) + reward.amount!;
      break;
    case 'xp': {
      // Level/currentLevelXP must stay in sync with the incremental logic in
      // storage.addXPToUser (100 XP per level, carried over from currentLevelXP),
      // NOT recomputed from lifetime xp — lifetime xp is never reset at season end,
      // so deriving level from it here silently undid the Battle Pass season reset
      // the next time a user spun the wheel.
      const currentLevel = user.level ?? 0;
      const currentLevelXP = user.currentLevelXP || 0;
      let newCurrentLevelXP = currentLevelXP + reward.amount!;
      let newLevel = currentLevel;
      while (newCurrentLevelXP >= 100) {
        newCurrentLevelXP -= 100;
        newLevel++;
      }
      updates.xp = (user.xp || 0) + reward.amount!;
      updates.currentLevelXP = newCurrentLevelXP;
      updates.level = newLevel;
      break;
    }
    case 'item':
      if (includeInventoryItems) {
        await storage.createInventory({
          userId,
          itemType: 'card_back',
          itemId: reward.itemId!,
        });
      }
      break;
  }

  // Atomic update of all user properties (coins, gems, xp, level)
  if (Object.keys(updates).length > 0) {
    await storage.updateUser(userId, updates);
  }
}

// 🔒 PRODUCTION-GRADE CSRF Protection Implementation
const generateCSRFToken = (): string => {
  return randomBytes(32).toString('hex');
};

const validateCSRFToken = (sessionToken: string, requestToken: string): boolean => {
  if (!sessionToken || !requestToken) return false;

  // Use constant-time comparison to prevent timing attacks
  if (sessionToken.length !== requestToken.length) return false;

  let result = 0;
  for (let i = 0; i < sessionToken.length; i++) {
    result |= sessionToken.charCodeAt(i) ^ requestToken.charCodeAt(i);
  }
  return result === 0;
};

// 🔒 CSRF Middleware for Critical Operations
const requireCSRF = (req: any, res: any, next: any) => {
  // Skip CSRF for GET/HEAD requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionToken = req.session?.csrfToken;
  const requestToken = req.headers['x-csrf-token'] || req.body._csrf;

  // Debug logging for CSRF validation
  console.log(`🔍 CSRF Debug - Method: ${req.method}, URL: ${req.url}`);
  console.log(`🔍 Session Token: ${sessionToken ? sessionToken.substring(0, 8) + '...' : 'MISSING'}`);
  console.log(`🔍 Request Token: ${requestToken ? requestToken.substring(0, 8) + '...' : 'MISSING'}`);

  if (!validateCSRFToken(sessionToken, requestToken)) {
    console.warn(`🚨 CSRF ATTACK BLOCKED: IP=${req.ip}, User=${req.session?.userId || 'anonymous'}`);
    console.warn(`🚨 Token mismatch - Session: ${sessionToken || 'NONE'}, Request: ${requestToken || 'NONE'}`);
    return res.status(403).json({ message: "CSRF token validation failed" });
  }

  console.log(`✅ CSRF validation passed for ${req.method} ${req.url}`);
  next();
};

// =================================================================================
// 🎲 SERVER-AUTHORITATIVE BLACKJACK — shared helpers
// The server owns the deck/hands for every real-money mode; the client only ever sends
// actions (hit/stand/double/split/surrender). See shared/blackjack-types.ts for PlayerHand.
// computeHandPayout/redactDealerHand/computeLegalActions/settleHandsAgainstDealer live in
// ./blackjackSettlement — they're stateless and shared with the Play with Friends multiplayer
// table in storage.ts, which can't import from here without a circular dependency (routes.ts
// already imports storage).
// =================================================================================

// Non-financial bookkeeping (stats/challenges/XP/audit) run after the atomic coin
// transaction has already committed — mirrors the old resolve route's ordering.
async function recordGameSettlement(
  userId: string,
  mode: string,
  playerHands: PlayerHand[],
  isMultiplayer: boolean = false
): Promise<void> {
  const totalPayout = playerHands.reduce((sum, h) => sum + (h.payout || 0), 0);
  const totalBet = playerHands.reduce((sum, h) => sum + h.bet, 0);
  const handsWon = playerHands.filter(h => h.result === "win" || h.result === "blackjack").length;
  const blackjacks = playerHands.filter(h => h.result === "blackjack").length;
  const busts = playerHands.filter(h => h.status === "busted").length;
  const netResult = totalPayout - totalBet;

  await storage.createGameStats({
    userId,
    gameType: mode,
    handsPlayed: 1,
    handsWon,
    handsLost: playerHands.filter(h => h.result === "lose").length,
    handsPushed: playerHands.filter(h => h.result === "push").length,
    totalWinnings: totalPayout,
    totalLosses: totalBet,
    blackjacks,
    busts,
    correctDecisions: 0,
    totalDecisions: 0,
  });

  // Drives the animal rank (season-scoped, resets with the Battle Pass) — separate from
  // the lifetime handsWon aggregated from gameStats above, which stays permanent.
  await storage.addSeasonHandsWon(userId, handsWon);

  // Classic Mode win-streak (solo only — Play with Friends tables run on the same "classic"
  // engine but are a separate mode in the UI, so they don't feed this leaderboard).
  if (mode === "classic" && !isMultiplayer) {
    const classicLosses = playerHands.filter(h => h.result === "lose").length;
    if (classicLosses > 0) {
      await storage.resetClassicStreak(userId);
    } else if (handsWon > 0) {
      let latestStreak = 0;
      for (let i = 0; i < handsWon; i++) {
        ({ newStreak: latestStreak } = await storage.incrementClassicStreak(userId));
      }
      await storage.upsertClassicWeeklyStreak(userId, latestStreak);
    }
    // Push-only hands leave the streak untouched.
  }

  // Daily win-streak (consecutive calendar days, independent of the win-streak above — a
  // single win today counts for the day even if other hands the same session lost). Only
  // flags that day's reward as claimable — the player claims it manually from the streak
  // popup (POST /api/daily-streak/claim), so there's no need for this to run synchronously
  // before the response the way it did when the reward was auto-credited.
  if (mode === "classic" && !isMultiplayer && handsWon > 0) {
    await storage.recordDailyStreakWin(userId);
  }

  await ChallengeService.updateChallengeProgress(userId, {
    handsPlayed: 1,
    handsWon,
    blackjacks,
    coinsWon: netResult,
  });

  // Weekly leaderboard now ranks by net coins won/lost from play this week, not XP —
  // see addWeeklyXP's comment in storage.ts. Skipped on push-only hands (netResult === 0)
  // to avoid a no-op upsert.
  if (netResult !== 0) {
    await storage.addWeeklyXP(userId, netResult);
  }

  const xpPerWin = 5;
  const blackjackXpBonus = 7; // on top of the normal win XP for that hand
  const xpGained = (handsWon * xpPerWin) + (blackjacks * blackjackXpBonus);
  if (xpGained > 0) {
    await storage.addXPToUser(userId, xpGained);
  }
}

// Play with Friends bookkeeping: recordGameSettlement is per-user, so a multiplayer hand
// (one row shared by up to 3 seats) just calls it once per seat after the table's settled —
// fire-and-forget, same as single-player's post-transaction bookkeeping.
async function recordTableHandSettlement(tableId: string): Promise<void> {
  try {
    const result = await storage.getGameTableWithSeats(tableId);
    if (!result) return;
    const { table, seats } = result;

    for (const seat of seats) {
      const hand = seat.hand as PlayerHand | null;
      if (!hand || hand.result === null) continue;
      await recordGameSettlement(
        seat.userId,
        table.mode,
        [hand],
        true // isMultiplayer — Play with Friends doesn't feed the Classic win-streak leaderboard
      );
    }
  } catch (error) {
    console.error("Error recording table hand settlement bookkeeping:", error);
  }
}

export async function registerRoutes(app: Express): Promise<void> {
  // 🏥 Health Check Endpoint (must be BEFORE any middleware)
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // 🌐 CORS Configuration for Capacitor mobile app and production domains
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Check if origin is in allowed list or matches localhost pattern
    const isAllowed = origin && (
      ALLOWED_ORIGINS.includes(origin) ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('capacitor://')
    );

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  });

  // 🔒 Trust proxy is required for secure cookies on Render/Heroku
  app.set('trust proxy', 1);

  const SIGNED_IN_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — a mobile app should keep users signed in

  // 🔒 SECURE Session configuration with enhanced CSRF protection — the middleware itself
  // lives in ./session so the WebSocket upgrade handler (server/websocket.ts) can share the
  // exact same instance/store to authenticate a table's live connection.
  app.use(sessionMiddleware);

  // 🔒 CRITICAL FIX: CSRF Token endpoint MUST be defined FIRST before any other routes
  // This ensures Express handles it before Vite can intercept it
  app.get("/api/csrf-token", (req, res) => {
    // 🔒 CRITICAL FIX: Ensure session exists even for anonymous users
    if (!req.session) {
      console.error("❌ Session not initialized for CSRF token request");
      return res.status(500).json({ message: "Session not initialized" });
    }

    // 🔒 SECURITY FIX: Use ONE token per session - avoid rotation
    let csrfToken = (req.session as any).csrfToken;

    if (!csrfToken) {
      // Generate new token ONLY if session doesn't have one
      csrfToken = generateCSRFToken();
      (req.session as any).csrfToken = csrfToken;
      console.log(`🆕 Generated NEW CSRF token for session: ${csrfToken.substring(0, 8)}...`);

      // Force session save for new token
      req.session.save((err: any) => {
        if (err) {
          console.error("❌ Failed to save session for new CSRF token:", err);
          return res.status(500).json({ message: "Session save failed" });
        }

        console.log(`✅ New CSRF token saved to session`);
        res.json({ csrfToken });
      });
    } else {
      // Return existing token from session - NO ROTATION
      console.log(`♻️  Reusing existing CSRF token: ${csrfToken.substring(0, 8)}...`);
      res.json({ csrfToken });
    }
  });

  // Drives the online/offline dot on the friends list (storage.getUserFriends). Throttled
  // in-memory per user rather than writing lastActiveAt on every single authenticated
  // request — the online window itself is 2 minutes, so anything more frequent than this is
  // wasted DB writes.
  const lastActiveWriteAt = new Map<string, number>();
  const LAST_ACTIVE_WRITE_THROTTLE_MS = 60 * 1000;

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.session.userId;
    const now = Date.now();
    if (now - (lastActiveWriteAt.get(userId) ?? 0) > LAST_ACTIVE_WRITE_THROTTLE_MS) {
      lastActiveWriteAt.set(userId, now);
      storage.touchLastActive(userId).catch((err) => console.error("Failed to touch lastActiveAt:", err));
    }

    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = insertUserSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user in Replit database with default values
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword
      });

      const emailVerificationToken = randomBytes(32).toString("hex");
      await storage.updateUser(newUser.id, {
        emailVerificationToken,
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      });

      sendVerificationEmail(email, emailVerificationToken).catch((err) =>
        console.error("Failed to send verification email:", err)
      );

      // No session is set here — the account can't sign in until the email is verified
      // (see the emailVerified check in /api/auth/login).
      res.json({ message: "Account created. Check your email to verify your address." });
    } catch (error: any) {
      // ZodError's own .message is the raw JSON-stringified issues array — the register
      // screen already blocks submitting a weak password before this is ever reached, so
      // this only fires for a direct API call bypassing that; still worth a clean message
      // over the same treatment the other Zod-validated routes already give theirs.
      if (error.name === "ZodError") {
        return res.status(400).json({ message: error.errors.map((e: any) => e.message).join(", ") });
      }
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const token = req.query.token;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Missing verification token" });
      }

      const user = await storage.getUserByEmailVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or already-used verification link" });
      }

      if (user.emailVerificationExpiresAt && new Date(user.emailVerificationExpiresAt) < new Date()) {
        return res.status(400).json({ message: "This verification link has expired — request a new one" });
      }

      const verifiedUser = await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      });

      // Sign the user in immediately on successful verification.
      (req.session as any).userId = verifiedUser.id;
      req.session.cookie.maxAge = SIGNED_IN_SESSION_MAX_AGE_MS;

      const { password: _, ...userWithoutPassword } = verifiedUser;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Verification failed" });
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      const user = await storage.getUserByUsername(username);
      // Same generic response whether or not the account exists/is already verified —
      // don't let this endpoint be used to probe which usernames are registered.
      if (!user || user.emailVerified) {
        return res.json({ message: "If that account needs verification, a new email has been sent." });
      }

      const emailVerificationToken = randomBytes(32).toString("hex");
      await storage.updateUser(user.id, {
        emailVerificationToken,
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      sendVerificationEmail(user.email, emailVerificationToken).catch((err) =>
        console.error("Failed to send verification email:", err)
      );

      res.json({ message: "If that account needs verification, a new email has been sent." });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to resend verification email" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials", errorType: "user_not_found" });
      }

      if (!user.password) {
        // Account was created via Apple Sign-In and has no password to check against.
        return res.status(401).json({ message: "This account signs in with Apple", errorType: "no_password_set" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials", errorType: "wrong_password" });
      }

      if (!user.emailVerified) {
        return res.status(401).json({ message: "Please verify your email before signing in", errorType: "email_not_verified" });
      }

      // Set session — extend past the anonymous default now that this session belongs
      // to a signed-in user (see SIGNED_IN_SESSION_MAX_AGE_MS above).
      (req.session as any).userId = user.id;
      req.session.cookie.maxAge = SIGNED_IN_SESSION_MAX_AGE_MS;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });

  // Sign in (or sign up) with Apple. The client sends the identityToken it gets straight
  // from AuthenticationServices via the Capacitor plugin — never trust anything else in
  // the body, the token itself is the only proof of identity.
  //
  // A brand-new Apple identity is created immediately, with an auto-generated username and
  // a random password — Apple's native sign-in sheet has no custom fields, so there's no
  // way to ask the user to pick either at this point without breaking out into a separate
  // screen (tried that, too much friction — Anatole wants sign-up with Apple to drop
  // straight into the app). The random password isn't unusable dead weight: it makes the
  // account a normal password account from the start, so the existing "forgot password"
  // flow (which requires a non-null password) already lets the user set a real one later.
  app.post("/api/auth/apple", async (req, res) => {
    try {
      const { identityToken } = req.body;
      if (!identityToken || typeof identityToken !== "string") {
        return res.status(400).json({ message: "Missing identity token" });
      }

      let applePayload;
      try {
        applePayload = await verifyAppleIdentityToken(identityToken);
      } catch (verifyError: any) {
        console.error("Apple identity token verification failed:", verifyError.message);
        return res.status(401).json({ message: "Invalid Apple identity token" });
      }

      let user = await storage.getUserByAppleId(applePayload.sub);

      if (!user && applePayload.email) {
        // Same email already has a password account — link Apple to it instead of
        // creating a duplicate, so the user can sign in either way going forward.
        const existingByEmail = await storage.getUserByEmail(applePayload.email);
        if (existingByEmail) {
          user = await storage.linkAppleId(existingByEmail.id, applePayload.sub);
        }
      }

      if (!user) {
        if (!applePayload.email) {
          // Apple only omits email on a later sign-in with a returning user it already
          // recognizes — if we don't have an appleId match by this point, we have no way
          // to create an account without one.
          return res.status(400).json({ message: "Apple did not provide an email for this sign-in" });
        }
        const username = await generateUniqueUsernameFromEmail(applePayload.email);
        const randomPassword = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
        user = await storage.createAppleUser({
          username,
          email: applePayload.email,
          appleId: applePayload.sub,
          password: randomPassword,
        });
      }

      (req.session as any).userId = user.id;
      req.session.cookie.maxAge = SIGNED_IN_SESSION_MAX_AGE_MS;

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      console.error("Apple sign-in error:", error);
      res.status(500).json({ message: error.message || "Apple sign-in failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  // Reset password route (without authentication)
  // Step 1: request a reset code. Always responds the same way regardless of whether the
  // email is registered — the old version of this flow let anyone reset anyone's password
  // just by knowing their email + username (neither of which is secret), a full account
  // takeover. Proof of owning the email inbox is now required.
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const GENERIC_RESPONSE = { message: "If that email is registered, a reset code has been sent." };

      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        // No account, or an Apple-only account with no password to reset — same response
        // either way so this can't be used to probe registered emails.
        return res.json(GENERIC_RESPONSE);
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await storage.updateUser(user.id, {
        passwordResetCode: code,
        passwordResetCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      });

      sendPasswordResetCodeEmail(user.email, code).catch((err) =>
        console.error("Failed to send password reset email:", err)
      );

      res.json(GENERIC_RESPONSE);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to request password reset" });
    }
  });

  // Step 2: verify the emailed code (without consuming it) so the client can move to the
  // "choose a new password" screen only after the code is confirmed correct.
  app.post("/api/auth/verify-reset-code", async (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ message: "Email and code are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordResetCode || !user.passwordResetCodeExpiresAt) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      if (new Date(user.passwordResetCodeExpiresAt) < new Date()) {
        return res.status(400).json({ message: "This code has expired — request a new one" });
      }

      if (user.passwordResetCode !== code) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      res.json({ message: "Code verified" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to verify code" });
    }
  });

  // Step 3: re-check the code and set the new password. The code is re-verified here (not
  // just trusted from step 2) since this is a separate, stateless request.
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        return res.status(400).json({ message: "Email, code, and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordResetCode || !user.passwordResetCodeExpiresAt) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      if (new Date(user.passwordResetCodeExpiresAt) < new Date()) {
        return res.status(400).json({ message: "This code has expired — request a new one" });
      }

      if (user.passwordResetCode !== code) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      await storage.updateUser(user.id, {
        password: hashedNewPassword,
        passwordResetCode: null,
        passwordResetCodeExpiresAt: null,
      });

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to reset password" });
    }
  });

  // Change password (signed-in user), step 1: send a code to the account's own email.
  // Mirrors the forgot-password flow instead of asking for the current password — the
  // session cookie already proves who's asking, so the email is looked up server-side
  // from the session, never trusted from the request body.
  app.post("/api/auth/request-password-change-code", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.password) {
        return res.status(400).json({ message: "This account has no password to change — it signs in with Apple" });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await storage.updateUser(user.id, {
        passwordResetCode: code,
        passwordResetCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      });

      sendPasswordResetCodeEmail(user.email, code).catch((err) =>
        console.error("Failed to send password change code email:", err)
      );

      res.json({ message: "A code has been sent to your email" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to send code" });
    }
  });

  // Change password (signed-in user), step 2: verify the code without consuming it.
  app.post("/api/auth/verify-password-change-code", requireAuth, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Code is required" });
      }

      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user || !user.passwordResetCode || !user.passwordResetCodeExpiresAt) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }
      if (new Date(user.passwordResetCodeExpiresAt) < new Date()) {
        return res.status(400).json({ message: "This code has expired — request a new one" });
      }
      if (user.passwordResetCode !== code) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      res.json({ message: "Code verified" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to verify code" });
    }
  });

  // Change password (signed-in user), step 3: re-check the code and set the new password.
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { code, newPassword } = req.body;
      const userId = (req.session as any).userId;

      if (!code || !newPassword) {
        return res.status(400).json({ message: "Code and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.password) {
        return res.status(400).json({ message: "This account has no password to change — it signs in with Apple" });
      }
      if (!user.passwordResetCode || !user.passwordResetCodeExpiresAt) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }
      if (new Date(user.passwordResetCodeExpiresAt) < new Date()) {
        return res.status(400).json({ message: "This code has expired — request a new one" });
      }
      if (user.passwordResetCode !== code) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await storage.updateUser(userId, {
        password: hashedNewPassword,
        passwordResetCode: null,
        passwordResetCodeExpiresAt: null,
      });

      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to change password" });
    }
  });

  // Change username route
  app.post("/api/auth/change-username", requireAuth, async (req, res) => {
    try {
      const { newUsername } = req.body;
      const userId = (req.session as any).userId;

      if (!newUsername) {
        return res.status(400).json({ message: "New username is required" });
      }

      if (newUsername.length < 3 || newUsername.length > 20) {
        return res.status(400).json({ message: "Username must be between 3 and 20 characters long" });
      }

      // Check if username contains only valid characters
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(newUsername)) {
        return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores" });
      }

      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(newUsername);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Username is already taken" });
      }

      // Update username
      const updatedUser = await storage.updateUser(userId, { username: newUsername });

      // Return user without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({
        message: "Username changed successfully",
        user: userWithoutPassword
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to change username" });
    }
  });

  // Delete account route (Apple App Store Guideline 5.1.1(v) — required in-app deletion)
  app.post("/api/auth/delete-account", requireAuth, async (req, res) => {
    try {
      const { password } = req.body;
      const userId = (req.session as any).userId;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.password) {
        // Password account: require re-confirming it before deleting.
        if (!password) {
          return res.status(400).json({ message: "Password is required to delete your account" });
        }
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(400).json({ message: "Password is incorrect" });
        }
      }
      // Apple-only account: no password to check — the authenticated session (requireAuth)
      // is already proof of identity.

      await storage.deleteUser(userId);

      req.session.destroy((err: any) => {
        if (err) {
          console.error("Failed to destroy session after account deletion:", err);
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Account deleted successfully" });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete account" });
    }
  });

  // User routes
  app.get("/api/user/profile", requireAuth, async (req, res) => {
    try {
      // Checked on this near-universal route (not just the Battle Pass screen) so the
      // season/level reset fires as soon as any user is active past the month boundary,
      // rather than staying stale until someone happens to open the Battle Pass page.
      await SeasonService.checkAndResetIfNeeded();

      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const updates = req.body;
      const updatedUser = await storage.updateUser((req.session as any).userId, updates);

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Coins endpoints
  app.get("/api/user/coins", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        coins: user.coins || 0
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/user/coins/update", requireAuth, async (req, res) => {
    try {
      const { amount } = req.body;

      if (typeof amount !== "number") {
        return res.status(400).json({ message: "Amount must be a number" });
      }

      const updatedUser = await storage.updateUserCoins((req.session as any).userId, amount);
      res.json({ coins: updatedUser.coins });
    } catch (error: any) {
      console.error("Error updating coins:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Gems endpoints
  app.get("/api/user/gems", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ gems: user.gems || 0 });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/user/gems/add", requireAuth, async (req, res) => {
    try {
      const { amount, description, relatedId } = req.body;

      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" });
      }

      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }

      const updatedUser = await storage.addGemsToUser((req.session as any).userId, amount, description, relatedId);
      res.json({ gems: updatedUser.gems });
    } catch (error: any) {
      console.error("Error adding gems:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/user/gems/spend", requireAuth, async (req, res) => {
    try {
      const { amount, description, relatedId } = req.body;

      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" });
      }

      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }

      const updatedUser = await storage.spendGemsFromUser((req.session as any).userId, amount, description, relatedId);
      res.json({ gems: updatedUser.gems });
    } catch (error: any) {
      console.error("Error spending gems:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/gems/transactions", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getUserGemTransactions((req.session as any).userId);
      res.json(transactions);
    } catch (error: any) {
      console.error("Error getting gem transactions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/gems/purchases", requireAuth, async (req, res) => {
    try {
      const purchases = await storage.getUserGemPurchases((req.session as any).userId);
      res.json(purchases);
    } catch (error: any) {
      console.error("Error getting gem purchases:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gems/purchase", requireAuth, async (req, res) => {
    try {
      const { itemType, itemId, gemCost } = req.body;

      if (!itemType || !itemId || typeof gemCost !== "number" || gemCost <= 0) {
        return res.status(400).json({ message: "Invalid purchase data" });
      }

      const userId = (req.session as any).userId;

      // Check if user has enough gems
      const user = await storage.getUser(userId);
      if (!user || (user.gems || 0) < gemCost) {
        return res.status(400).json({ message: "Insufficient gems" });
      }

      // Create purchase record
      const purchase = await storage.createGemPurchase({
        userId,
        itemType,
        itemId,
        gemCost,
      });

      // Spend gems
      const updatedUser = await storage.spendGemsFromUser(userId, gemCost, `Purchase: ${itemType} ${itemId}`, purchase.id);

      res.json({
        purchase,
        remainingGems: updatedUser.gems
      });
    } catch (error: any) {
      console.error("Error purchasing with gems:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Rank Rewards routes
  app.get("/api/ranks/claimed-rewards", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const claimedRewards = await storage.getUserClaimedRankRewards(userId);
      res.json(claimedRewards);
    } catch (error: any) {
      console.error("Error getting claimed rank rewards:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ranks/claim-reward", requireAuth, requireCSRF, async (req, res) => {
    try {
      const { rankKey } = req.body;
      const userId = (req.session as any).userId;

      if (!rankKey || typeof rankKey !== "string") {
        return res.status(400).json({ message: "Invalid reward data" });
      }

      // The reward amount is never taken from the client — look it up server-side and
      // verify the user's real hands-won total actually qualifies for this rank. Without
      // this, a request could claim an invented rankKey with any gemsAwarded value and
      // mint unlimited gems.
      const rankDefinition = getRankDefinition(rankKey);
      if (!rankDefinition || !rankDefinition.gemReward) {
        return res.status(400).json({ message: "Unknown rank or no reward for this rank" });
      }

      // Season-scoped counter (not the lifetime gameStats.handsWon stat) — ranks reset
      // every season alongside the Battle Pass, so qualification must too.
      const user = await storage.getUser(userId);
      if ((user?.seasonHandsWon || 0) < rankDefinition.min) {
        return res.status(403).json({ message: "You haven't reached this rank yet" });
      }

      // Check if already claimed
      const alreadyClaimed = await storage.hasUserClaimedRankReward(userId, rankKey);
      if (alreadyClaimed) {
        return res.status(400).json({ message: "Reward already claimed" });
      }

      // Claim the reward
      const claim = await storage.claimRankReward(userId, rankKey, rankDefinition.gemReward);

      // Get updated user data (gems changed by the claim above)
      const updatedUser = await storage.getUser(userId);

      res.json({
        success: true,
        claim,
        totalGems: updatedUser?.gems || 0
      });
    } catch (error: any) {
      console.error("Error claiming rank reward:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Purchase avatar with gems
  app.post("/api/avatars/purchase", requireAuth, async (req, res) => {
    try {
      const { avatarId } = req.body;

      if (!avatarId || typeof avatarId !== "string") {
        return res.status(400).json({ message: "Invalid avatar ID" });
      }

      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Price is derived from the avatar's category server-side — never trust a cost from
      // the client. See shared/avatarCatalog.ts (People free / Animals 150 / Fantasy 400).
      const avatarCost = avatarCostFor(avatarId);

      // Check if user has enough gems
      if ((user.gems || 0) < avatarCost) {
        return res.status(400).json({ message: "Insufficient gems" });
      }

      // Get current owned avatars
      const ownedAvatars = Array.isArray(user.ownedAvatars) ? user.ownedAvatars as string[] : [];

      // Check if avatar is already owned
      if (ownedAvatars.includes(avatarId)) {
        return res.status(400).json({ message: "Avatar already owned" });
      }

      // Add avatar to owned avatars
      const newOwnedAvatars = [...ownedAvatars, avatarId];
      await storage.updateUser(userId, {
        ownedAvatars: newOwnedAvatars
      });

      let remainingGems = user.gems || 0;
      if (avatarCost > 0) {
        // Create purchase record
        const purchase = await storage.createGemPurchase({
          userId,
          itemType: 'avatar',
          itemId: avatarId,
          gemCost: avatarCost,
        });

        // Spend gems and create transaction record
        const updatedUser = await storage.spendGemsFromUser(userId, avatarCost, `Avatar purchase: ${avatarId}`, purchase.id);
        remainingGems = updatedUser.gems || 0;
      }

      res.json({
        success: true,
        avatarId,
        remainingGems,
        ownedAvatars: newOwnedAvatars
      });
    } catch (error: any) {
      console.error("Error purchasing avatar:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's owned avatars
  app.get("/api/user/owned-avatars", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // First 28 avatars are free for everyone
      const freeAvatars = Array.from({ length: 28 }, (_, i) => `avatar-${i}`);
      const ownedAvatars = Array.isArray(user.ownedAvatars) ? user.ownedAvatars as string[] : [];

      res.json({
        ownedAvatars: [...freeAvatars, ...ownedAvatars],
        freeAvatars: freeAvatars,
        purchasedAvatars: ownedAvatars
      });
    } catch (error: any) {
      console.error("Error getting owned avatars:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Server-side gem offers catalog. Coin amounts were cut ~5x (Aug 2026 economy pass) to
  // stay a bit worse than buying coins directly with the equivalent real-money value of
  // the gems spent — otherwise exchanging gems for coins undercuts the coin packs.
  const GEM_OFFERS = {
    'coins-5k': { type: 'coins', amount: 750, gemCost: 50 },
    'coins-15k': { type: 'coins', amount: 1500, gemCost: 100 },
    'coins-3000': { type: 'coins', amount: 3000, gemCost: 200 },
    // Swap tokens (Classic solo's discard-and-redeal resource). Rates confirmed with Anatole
    // (2026-09-02) -- ids kept as 'swap-3'/'swap-6'/'swap-12' even though the amounts no longer
    // match, same as the 'coins-5k' etc. ids above.
    'swap-3': { type: 'swapTokens', amount: 10, gemCost: 50 },
    'swap-6': { type: 'swapTokens', amount: 25, gemCost: 100 },
    'swap-12': { type: 'swapTokens', amount: 40, gemCost: 150 },
  };

  // Gem shop purchases (buy coins or swap tokens with gems)
  app.post("/api/shop/gem-purchase", requireAuth, requireCSRF, async (req, res) => {
    try {
      // Validate request body with strict schema
      const validOfferIds = ['coins-5k', 'coins-15k', 'coins-3000', 'swap-3', 'swap-6', 'swap-12'] as const;
      const { offerId } = req.body;

      if (!offerId || typeof offerId !== 'string' || !validOfferIds.includes(offerId as any)) {
        return res.status(400).json({ message: "Invalid offer ID" });
      }

      const offer = GEM_OFFERS[offerId as keyof typeof GEM_OFFERS];
      if (!offer) {
        return res.status(400).json({ message: "Invalid offer" });
      }

      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has enough gems
      if ((user.gems || 0) < offer.gemCost) {
        return res.status(400).json({ message: "Insufficient gems" });
      }

      // True atomic update: single operation to prevent race conditions
      const updates: any = {
        gems: (user.gems || 0) - offer.gemCost
      };

      if (offer.type === 'coins') {
        updates.coins = (user.coins || 0) + offer.amount;
      } else if (offer.type === 'swapTokens') {
        updates.swapTokens = (user.swapTokens || 0) + offer.amount;
      }

      // Single atomic update to prevent concurrent modification issues
      await storage.updateUser(userId, updates);

      res.json({
        success: true,
        message: `Successfully purchased ${offer.amount} ${offer.type} for ${offer.gemCost} gems`
      });
    } catch (error: any) {
      console.error("Error purchasing with gems:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Chests — spend gems for a random reward. Price comes from the shared catalog (never trust
  // a client-supplied cost). gold/purple/crown roll from the exact same reward tables as their
  // Battle Pass counterparts (shared/battlePassChests.ts's rollChestReward) via
  // storage.openChest, so a chest pays out the same thing whether it's bought here or earned
  // from a Battle Pass tier.
  app.post("/api/chests/open", requireAuth, requireCSRF, async (req, res) => {
    try {
      const { tier } = req.body;
      if (!CHEST_TIERS.includes(tier)) {
        return res.status(400).json({ message: "Invalid chest tier" });
      }

      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const cost = chestCostFor(tier);
      if ((user.gems || 0) < cost) {
        return res.status(400).json({ message: "Not enough gems" });
      }

      const result = await storage.openChest(userId, tier);
      res.json({ reward: result });
    } catch (error: any) {
      if (error.message === "Not enough gems") {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error opening chest:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Betting endpoints
  app.post("/api/bets/prepare", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      console.log(`🔍 [DEBUG] Preparing bet for user ${userId}`, req.body);

      // Validate request body with Zod
      const parseResult = betPrepareSchema.safeParse(req.body);
      if (!parseResult.success) {
        console.error("❌ [DEBUG] Bet validation failed:", parseResult.error);
        const errorMessage = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return res.status(400).json({ message: `Invalid request data: ${errorMessage}` });
      }

      const { betId, amount, mode } = parseResult.data;

      // Cleanup expired bet drafts first
      await storage.cleanupExpiredBetDrafts();

      // Get user and validate coins
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate bet amount against user coins
      const userCoins = user.coins || 0;
      if (amount > userCoins) {
        return res.status(400).json({ message: "Insufficient coins" });
      }

      // Basic bet limits (can be extended per mode)
      const minBet = 1;
      const tableMax = userCoins; // Allow betting up to full balance

      if (amount < minBet || amount > tableMax) {
        return res.status(400).json({ message: `Bet must be between ${minBet} and ${tableMax}` });
      }

      // Check if bet draft already exists (prevent duplicates)
      const existingDraft = await storage.getBetDraft(betId);
      if (existingDraft) {
        return res.status(409).json({ message: "Bet draft already exists" });
      }

      // Create bet draft with 60 second expiry
      const expiresAt = new Date(Date.now() + 60 * 1000);
      const betDraft = await storage.createBetDraft({
        betId,
        userId,
        amount,
        mode: mode || null,
        expiresAt,
      });

      res.json({
        success: true,
        betDraft: {
          betId: betDraft.betId,
          amount: betDraft.amount,
          expiresAt: betDraft.expiresAt
        }
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error preparing bet:", error);
      res.status(500).json({ message: error.message || "Failed to prepare bet" });
    }
  });

  app.post("/api/bets/commit", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      // Validate request body with Zod
      const { betId } = betCommitSchema.parse(req.body);

      // Cleanup expired bet drafts first
      await storage.cleanupExpiredBetDrafts();

      // Start atomic transaction for commit operation
      const result = await db.transaction(async (tx: any) => {
        // Re-fetch and validate bet draft within transaction
        const [betDraft] = await tx.select().from(betDrafts).where(eq(betDrafts.betId, betId));

        if (!betDraft) {
          throw new Error("BET_DRAFT_NOT_FOUND");
        }

        // Check if draft expired
        if (new Date() > betDraft.expiresAt) {
          await tx.delete(betDrafts).where(eq(betDrafts.betId, betId));
          throw new Error("BET_DRAFT_EXPIRED");
        }

        // Verify ownership
        if (betDraft.userId !== userId) {
          throw new Error("UNAUTHORIZED_BET_ACCESS");
        }

        // Get current user state within transaction
        const [user] = await tx.select().from(users).where(eq(users.id, userId));
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        // Re-validate bet limits dynamically
        const currentCoins = user.coins || 0;
        const minBet = 1;
        const tableMax = currentCoins; // Allow betting up to full balance

        if (betDraft.amount < minBet || betDraft.amount > tableMax) {
          throw new Error("BET_AMOUNT_INVALID");
        }

        // Final validation of bet amount against current coins
        if (betDraft.amount > currentCoins) {
          throw new Error("INSUFFICIENT_COINS");
        }

        // Atomic coin deduction with WHERE constraint to prevent race conditions
        const newCoinsAmount = currentCoins - betDraft.amount;
        const [updatedUser] = await tx
          .update(users)
          .set({ coins: newCoinsAmount })
          .where(and(
            eq(users.id, userId),
            gte(users.coins, betDraft.amount)
          ))
          .returning();

        if (!updatedUser) {
          throw new Error("ATOMIC_COIN_DEDUCTION_FAILED");
        }

        // Delete bet draft only after successful coin deduction
        await tx.delete(betDrafts).where(eq(betDrafts.betId, betId));

        return {
          success: true,
          deductedAmount: betDraft.amount,
          remainingCoins: updatedUser.coins,
          mode: betDraft.mode
        };
      });

      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }

      // Handle specific business logic errors with appropriate HTTP status codes
      switch (error.message) {
        case "BET_DRAFT_NOT_FOUND":
          return res.status(404).json({ message: "Bet draft not found" });
        case "BET_DRAFT_EXPIRED":
          return res.status(410).json({ message: "Bet draft expired" });
        case "UNAUTHORIZED_BET_ACCESS":
          return res.status(403).json({ message: "Unauthorized bet access" });
        case "USER_NOT_FOUND":
          return res.status(404).json({ message: "User not found" });
        case "BET_AMOUNT_INVALID":
          return res.status(400).json({ message: "Bet amount is invalid for current limits" });
        case "INSUFFICIENT_COINS":
        case "ATOMIC_COIN_DEDUCTION_FAILED":
          return res.status(409).json({ message: "Insufficient coins" });
        default:
          console.error("Error committing bet:", error);
          return res.status(500).json({ message: "Failed to commit bet" });
      }
    }
  });

  app.post("/api/bets/cancel", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { betId } = req.body;

      if (!betId) {
        return res.status(400).json({ message: "BetId required" });
      }

      // Get bet draft to verify ownership
      const betDraft = await storage.getBetDraft(betId);
      if (!betDraft) {
        return res.status(404).json({ message: "Bet draft not found" });
      }

      // Verify ownership
      if (betDraft.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized bet access" });
      }

      // Delete bet draft
      await storage.deleteBetDraft(betId);

      res.json({ success: true, message: "Bet draft cancelled" });
    } catch (error: any) {
      console.error("Error cancelling bet:", error);
      res.status(500).json({ message: error.message || "Failed to cancel bet" });
    }
  });

  // =================================================================================
  // 🎲 SERVER-AUTHORITATIVE BLACKJACK — the server deals from its own shuffled deck and
  // computes every outcome itself. The client only ever sends actions; it never declares
  // a result. See shared/blackjack-types.ts and the helpers defined above registerRoutes.
  // =================================================================================

  // START GAME — debits the bet, deals real cards from a fresh shuffled deck, and either
  // settles immediately (natural blackjack) or persists an in-progress active_games row.
  app.post("/api/game/start", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const mode: string = req.body.mode;

      if (mode !== "classic") {
        return res.status(400).json({ message: "Invalid mode" });
      }

      // An orphaned in_progress row (e.g. the app was killed mid-hand, or a still-installed
      // older client that never learned to resume via GET /api/game/active) must never
      // permanently block a user from playing again — refund its bet and abandon it rather
      // than hard-blocking with a 409 the old client would show as "insufficient funds".
      const existingGame = await storage.getActiveGameForUser(userId);
      if (existingGame) {
        await db
          .update(users)
          .set({
            coins: sql`${users.coins} + ${existingGame.betAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
        await storage.updateActiveGame(existingGame.id, { status: "abandoned" });
        console.warn(`⚠️ Abandoned orphaned active_games row ${existingGame.id} for user ${userId}, refunded ${existingGame.betAmount} coins`);
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const betAmount = Math.floor(Number(req.body.amount));
      if (!Number.isFinite(betAmount) || betAmount <= 0) {
        return res.status(400).json({ message: "Invalid bet amount" });
      }
      if ((user.coins || 0) < betAmount) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      // Atomic debit — the WHERE guard makes this race-safe against concurrent spends,
      // same pattern as the proven /api/bets/commit debit.
      const [debitedUser] = await db
        .update(users)
        .set({
          coins: sql`${users.coins} - ${betAmount}`,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, userId), gte(users.coins, betAmount)))
        .returning();

      if (!debitedUser) {
        return res.status(409).json({ message: "Insufficient funds" });
      }

      const deck = ServerBlackjackEngine.createShuffledDeck();
      const deckSeed = randomBytes(16).toString("hex");
      const deckHash = createHash("sha256").update(JSON.stringify(deck)).digest("hex");

      const playerCards = [deck.pop()!, deck.pop()!];
      const dealerCards = [deck.pop()!, deck.pop()!];

      if (ServerBlackjackEngine.isBlackjack(playerCards)) {
        // Natural blackjack settles immediately — no waiting on player action.
        const outcome = ServerBlackjackEngine.determineWinner(playerCards, dealerCards);
        const payout = computeHandPayout(mode, outcome.result, outcome.isPlayerBlackjack, betAmount);
        const playerHands: PlayerHand[] = [{
          cards: playerCards,
          bet: betAmount,
          doubled: false,
          status: "blackjack",
          result: outcome.result === "push" ? "push" : "blackjack",
          payout,
        }];

        const [settledUser] = await db
          .update(users)
          .set({ coins: sql`${users.coins} + ${payout}`, updatedAt: new Date() })
          .where(eq(users.id, userId))
          .returning();

        // Persisted (not just reported inline) so a natural blackjack has a real gameId too —
        // the "watch an ad to double" offer on the result sheet needs a row to double against,
        // same as a hand that went through /api/game/action.
        const settledGame = await storage.createActiveGame({
          userId, mode, status: "in_progress", betAmount,
          deck, deckSeed, deckHash,
          playerHands, dealerHand: dealerCards, activeHandIndex: 0,
        });
        await storage.completeActiveGame(settledGame.id);

        await recordGameSettlement(userId, mode, playerHands);

        return res.json({
          success: true,
          gameId: settledGame.id,
          status: "completed",
          mode,
          betAmount,
          playerHands,
          dealerHand: dealerCards,
          activeHandIndex: 0,
          legalActions: [],
          result: { payout, netResult: payout - betAmount },
          remainingCoins: settledUser.coins,
        });
      }

      const playerHand: PlayerHand = { cards: playerCards, bet: betAmount, doubled: false, status: "active", result: null, payout: null };
      const activeGame = await storage.createActiveGame({
        userId,
        mode,
        status: "in_progress",
        betAmount,
        deck,
        deckSeed,
        deckHash,
        playerHands: [playerHand],
        dealerHand: dealerCards,
        activeHandIndex: 0,
      });

      // Drives whether Swap lights up (see handStrength.ts). Computed against this exact
      // remaining deck (already down 4 cards from the pop()s above) so it's ready in the very
      // same response that deals the cards, not a separate round-trip after.
      const winProbability = simulateWinProbability(playerCards, dealerCards[0], deck);

      res.json({
        success: true,
        gameId: activeGame.id,
        status: "in_progress",
        mode,
        betAmount,
        playerHands: [playerHand],
        dealerHand: redactDealerHand(dealerCards),
        activeHandIndex: 0,
        legalActions: computeLegalActions(playerHand, mode, [playerHand]),
        remainingCoins: debitedUser.coins,
        winProbability,
      });
    } catch (error: any) {
      console.error("Error starting game:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ACTION — hit/stand/double/split/surrender. Re-validates the action server-side against
  // the persisted game state (never trusts client UI state), mutates the real deck/hands, and
  // once every hand is done, plays the dealer out and settles/credits atomically.
  app.post("/api/game/action", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { gameId, action } = req.body as { gameId?: string; action?: GameAction };

      if (!gameId || !["hit", "stand", "double", "split", "surrender"].includes(action || "")) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const outcome = await db.transaction(async (tx: any) => {
        const [game] = await tx.select().from(activeGames).where(eq(activeGames.id, gameId)).for("update");

        if (!game) return { status: 404 as const, body: { message: "Game not found" } };
        if (game.userId !== userId) return { status: 403 as const, body: { message: "Unauthorized" } };
        if (game.status !== "in_progress") return { status: 400 as const, body: { message: "Game already resolved" } };

        const deck = game.deck as Card[];
        const playerHands = game.playerHands as PlayerHand[];
        const dealerHand = game.dealerHand as Card[];
        let activeHandIndex = game.activeHandIndex;
        const activeHand = playerHands[activeHandIndex];
        const legalActions = computeLegalActions(activeHand, game.mode, playerHands);

        if (!legalActions.includes(action as GameAction)) {
          return { status: 400 as const, body: { message: "Illegal action for current game state" } };
        }

        if (action === "hit") {
          const card = deck.pop();
          if (!card) throw new Error("Deck exhausted");
          activeHand.cards.push(card);
          if (ServerBlackjackEngine.calculateTotal(activeHand.cards) > 21) activeHand.status = "busted";
        } else if (action === "stand") {
          activeHand.status = "standing";
        } else if (action === "double") {
          const [debited] = await tx
            .update(users)
            .set({ coins: sql`${users.coins} - ${activeHand.bet}`, updatedAt: new Date() })
            .where(and(eq(users.id, userId), gte(users.coins, activeHand.bet)))
            .returning();
          if (!debited) return { status: 400 as const, body: { message: "Insufficient funds to double" } };
          activeHand.bet *= 2;
          activeHand.doubled = true;
          const card = deck.pop();
          if (!card) throw new Error("Deck exhausted");
          activeHand.cards.push(card);
          activeHand.status = ServerBlackjackEngine.calculateTotal(activeHand.cards) > 21 ? "busted" : "standing";
        } else if (action === "split") {
          const [debited] = await tx
            .update(users)
            .set({ coins: sql`${users.coins} - ${activeHand.bet}`, updatedAt: new Date() })
            .where(and(eq(users.id, userId), gte(users.coins, activeHand.bet)))
            .returning();
          if (!debited) return { status: 400 as const, body: { message: "Insufficient funds to split" } };
          const [cardA, cardB] = activeHand.cards;
          const handA: PlayerHand = { cards: [cardA], bet: activeHand.bet, doubled: false, status: "active", result: null, payout: null };
          const handB: PlayerHand = { cards: [cardB], bet: activeHand.bet, doubled: false, status: "active", result: null, payout: null };
          playerHands.splice(activeHandIndex, 1, handA, handB);
        } else if (action === "surrender") {
          activeHand.status = "surrendered";
        }

        while (activeHandIndex < playerHands.length && playerHands[activeHandIndex].status !== "active") {
          activeHandIndex++;
        }
        const allDone = activeHandIndex >= playerHands.length;

        if (!allDone) {
          await tx.update(activeGames).set({ deck, playerHands, dealerHand, activeHandIndex, updatedAt: new Date() }).where(eq(activeGames.id, gameId));
          return {
            status: 200 as const,
            body: {
              success: true, gameId, status: "in_progress", mode: game.mode, betAmount: game.betAmount,
              playerHands, dealerHand: redactDealerHand(dealerHand), activeHandIndex,
              legalActions: computeLegalActions(playerHands[activeHandIndex], game.mode, playerHands),
            },
          };
        }

        settleHandsAgainstDealer(game.mode, deck, dealerHand, playerHands);
        const totalPayout = playerHands.reduce((sum, h) => sum + (h.payout || 0), 0);
        const totalBet = playerHands.reduce((sum, h) => sum + h.bet, 0);

        const [settledUser] = await tx
          .update(users)
          .set({ coins: sql`${users.coins} + ${totalPayout}`, updatedAt: new Date() })
          .where(eq(users.id, userId))
          .returning();

        await tx.update(activeGames).set({ status: "completed", deck, playerHands, dealerHand, activeHandIndex, resolvedAt: new Date(), updatedAt: new Date() }).where(eq(activeGames.id, gameId));

        return {
          status: 200 as const,
          body: {
            success: true, gameId, status: "completed", mode: game.mode, betAmount: game.betAmount,
            playerHands, dealerHand, activeHandIndex, legalActions: [],
            result: { payout: totalPayout, netResult: totalPayout - totalBet },
            remainingCoins: settledUser.coins,
          },
          bookkeeping: { mode: game.mode, playerHands },
        };
      });

      res.status(outcome.status).json(outcome.body);

      if ((outcome as any).bookkeeping) {
        // Response already sent — a failure here must not attempt to write to it again.
        const bk = (outcome as any).bookkeeping;
        try {
          await recordGameSettlement(userId, bk.mode, bk.playerHands);
        } catch (bookkeepingError) {
          console.error("Error recording game settlement bookkeeping:", bookkeepingError);
        }
      }
    } catch (error: any) {
      console.error("Error processing game action:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // SWAP — Classic solo only. Spends 1 Swap token (or, with viaAd, a rewarded ad watched in
  // place of a token — same trust model as the double-reward ad flow above: the client only
  // ever calls this after showRewardedAd() resolves true, no server-side ad verification) to
  // discard the player's starting 2-card hand and deal 2 fresh cards from the very same
  // already-shuffled deck (the dealer's hand is untouched). Only legal on the original,
  // un-split, un-acted-on hand — same "first decision" window Double uses (see
  // computeLegalActions) — and capped at one swap per hand, enforced here via
  // PlayerHand.swapped even though the client already disables the button after one use.
  app.post("/api/game/swap", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { gameId, viaAd } = req.body as { gameId?: string; viaAd?: boolean };

      if (!gameId) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const outcome = await db.transaction(async (tx: any) => {
        const [game] = await tx.select().from(activeGames).where(eq(activeGames.id, gameId)).for("update");

        if (!game) return { status: 404 as const, body: { message: "Game not found" } };
        if (game.userId !== userId) return { status: 403 as const, body: { message: "Unauthorized" } };
        if (game.status !== "in_progress") return { status: 400 as const, body: { message: "Hand not in progress" } };

        const playerHands = game.playerHands as PlayerHand[];
        const hand = playerHands[game.activeHandIndex];
        // Excludes split hands entirely for v1 — refreshing one half of an already-split pair
        // doesn't match "bad starting hand," so this only ever fires on hand #0 before a split
        // has happened.
        if (playerHands.length !== 1 || !hand || hand.status !== "active" || hand.cards.length !== 2) {
          return { status: 400 as const, body: { message: "Too late to swap" } };
        }
        if (hand.swapped) {
          return { status: 409 as const, body: { message: "Already swapped this hand" } };
        }

        const [userRow] = await tx
          .select({ swapTokens: users.swapTokens })
          .from(users)
          .where(eq(users.id, userId))
          .for("update");
        if (!viaAd && (!userRow || (userRow.swapTokens || 0) <= 0)) {
          return { status: 400 as const, body: { message: "No swaps left" } };
        }

        // An ad-earned swap spends nothing — the balance stays whatever it already was.
        const finalSwapTokens = viaAd
          ? userRow?.swapTokens || 0
          : (
              await tx
                .update(users)
                .set({ swapTokens: sql`${users.swapTokens} - 1`, updatedAt: new Date() })
                .where(eq(users.id, userId))
                .returning()
            )[0].swapTokens;

        const deck = game.deck as Card[];
        const newCards = [deck.pop()!, deck.pop()!];

        if (ServerBlackjackEngine.isBlackjack(newCards)) {
          // A natural on the redeal settles immediately, exactly like a natural on the
          // original deal in POST /api/game/start.
          const dealerCards = game.dealerHand as Card[];
          const result = ServerBlackjackEngine.determineWinner(newCards, dealerCards);
          const payout = computeHandPayout(game.mode, result.result, result.isPlayerBlackjack, hand.bet);
          const settledHand: PlayerHand = {
            ...hand,
            cards: newCards,
            swapped: true,
            status: "blackjack",
            result: result.result === "push" ? "push" : "blackjack",
            payout,
          };

          const [creditedUser] = await tx
            .update(users)
            .set({ coins: sql`${users.coins} + ${payout}`, updatedAt: new Date() })
            .where(eq(users.id, userId))
            .returning();

          await tx
            .update(activeGames)
            .set({ status: "completed", deck, playerHands: [settledHand], resolvedAt: new Date(), updatedAt: new Date() })
            .where(eq(activeGames.id, gameId));

          return {
            status: 200 as const,
            body: {
              success: true,
              gameId,
              status: "completed",
              mode: game.mode,
              betAmount: game.betAmount,
              playerHands: [settledHand],
              dealerHand: dealerCards,
              activeHandIndex: 0,
              legalActions: [],
              result: { payout, netResult: payout - hand.bet },
              remainingCoins: creditedUser.coins,
              swapTokens: finalSwapTokens,
            },
            bookkeeping: { mode: game.mode, playerHands: [settledHand] },
          };
        }

        const newHand: PlayerHand = { ...hand, cards: newCards, swapped: true };
        await tx
          .update(activeGames)
          .set({ deck, playerHands: [newHand], updatedAt: new Date() })
          .where(eq(activeGames.id, gameId));

        return {
          status: 200 as const,
          body: {
            success: true,
            gameId,
            status: "in_progress",
            mode: game.mode,
            betAmount: game.betAmount,
            playerHands: [newHand],
            dealerHand: redactDealerHand(game.dealerHand as Card[]),
            activeHandIndex: 0,
            legalActions: computeLegalActions(newHand, game.mode, [newHand]),
            swapTokens: finalSwapTokens,
          },
        };
      });

      res.status(outcome.status).json(outcome.body);

      if ((outcome as any).bookkeeping) {
        const bk = (outcome as any).bookkeeping;
        try {
          await recordGameSettlement(userId, bk.mode, bk.playerHands);
        } catch (bookkeepingError) {
          console.error("Error recording swap settlement bookkeeping:", bookkeepingError);
        }
      }
    } catch (error: any) {
      console.error("Error swapping hand:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // DOUBLE REWARD — Classic solo's "watch an ad to double your win" offer on the result
  // sheet. Trusts the client's report that the rewarded ad played through, same as the
  // wheel-of-fortune ad-spin flow — the actual coin grant stays server-authoritative and
  // gated on the hand's own persisted, one-time-claimable net result.
  // Drives the "n/3 today" label and the greyed-out countdown state under the double-reward
  // button — read on every result sheet mount rather than trusting client-side state, since
  // that state doesn't survive an app restart.
  app.get("/api/game/double-reward/status", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const [userRow] = await db
        .select({ watched: users.doubleRewardAdsWatched, date: users.doubleRewardAdsDate })
        .from(users)
        .where(eq(users.id, userId));
      const todayKey = getParisDateKey(new Date());
      const watchedToday = userRow?.date === todayKey ? (userRow.watched ?? 0) : 0;
      res.json({
        watchedToday,
        limit: DOUBLE_REWARD_AD_DAILY_LIMIT,
        resetAt: watchedToday >= DOUBLE_REWARD_AD_DAILY_LIMIT ? getNextParisMidnight(new Date()).toISOString() : null,
      });
    } catch (error: any) {
      console.error("Error fetching double-reward status:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/game/double-reward", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { gameId } = req.body as { gameId?: string };

      if (!gameId) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const outcome = await db.transaction(async (tx: any) => {
        const [game] = await tx.select().from(activeGames).where(eq(activeGames.id, gameId)).for("update");

        if (!game) return { status: 404 as const, body: { message: "Game not found" } };
        if (game.userId !== userId) return { status: 403 as const, body: { message: "Unauthorized" } };
        if (game.status !== "completed") return { status: 400 as const, body: { message: "Hand not resolved yet" } };
        if (game.rewardDoubled) return { status: 409 as const, body: { message: "Reward already doubled" } };

        const playerHands = game.playerHands as PlayerHand[];
        const totalPayout = playerHands.reduce((sum, h) => sum + (h.payout || 0), 0);
        const totalBet = playerHands.reduce((sum, h) => sum + h.bet, 0);
        const netResult = totalPayout - totalBet;

        if (netResult <= 0) {
          return { status: 400 as const, body: { message: "Nothing to double" } };
        }

        // Capped at DOUBLE_REWARD_AD_DAILY_LIMIT claims per Paris calendar day — locked
        // alongside the game row so a double-tap can't slip two claims past the limit.
        const [userRow] = await tx
          .select({ watched: users.doubleRewardAdsWatched, date: users.doubleRewardAdsDate })
          .from(users)
          .where(eq(users.id, userId))
          .for("update");
        const todayKey = getParisDateKey(new Date());
        const watchedToday = userRow?.date === todayKey ? (userRow.watched ?? 0) : 0;

        if (watchedToday >= DOUBLE_REWARD_AD_DAILY_LIMIT) {
          return {
            status: 429 as const,
            body: {
              message: "Daily limit reached",
              watchedToday,
              limit: DOUBLE_REWARD_AD_DAILY_LIMIT,
              resetAt: getNextParisMidnight(new Date()).toISOString(),
            },
          };
        }

        const [creditedUser] = await tx
          .update(users)
          .set({
            coins: sql`${users.coins} + ${netResult}`,
            doubleRewardAdsWatched: watchedToday + 1,
            doubleRewardAdsDate: todayKey,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning();

        await tx.update(activeGames).set({ rewardDoubled: true, updatedAt: new Date() }).where(eq(activeGames.id, gameId));

        return {
          status: 200 as const,
          body: {
            success: true,
            newNetResult: netResult * 2,
            remainingCoins: creditedUser.coins,
            watchedToday: watchedToday + 1,
            limit: DOUBLE_REWARD_AD_DAILY_LIMIT,
          },
        };
      });

      // The weekly leaderboard ranks net coins won/lost from actual hands (Classic + Play
      // with Friends) only — recordGameSettlement already counted this hand's own
      // netResult, so the extra coins from doubling it must NOT be added on top here.
      res.status(outcome.status).json(outcome.body);
    } catch (error: any) {
      console.error("Error doubling reward:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Resume support — lets the client recover an in-progress game after a refresh/kill,
  // and lets /start safely 409 on a duplicate.
  app.get("/api/game/active", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const game = await storage.getActiveGameForUser(userId);
      if (!game) return res.json({ active: false });

      const playerHands = game.playerHands as PlayerHand[];
      const activeHand = playerHands[game.activeHandIndex];
      // Only worth recomputing (see handStrength.ts) for the same window Swap itself is
      // legal in — a resumed hand mid-hit, already swapped, or past the first decision has
      // nothing for this to drive.
      const swapWindow =
        playerHands.length === 1 && activeHand?.status === "active" && activeHand.cards.length === 2 && !activeHand.swapped;
      const winProbability = swapWindow
        ? simulateWinProbability(activeHand.cards, (game.dealerHand as Card[])[0], game.deck as Card[])
        : undefined;

      res.json({
        active: true,
        gameId: game.id,
        status: game.status,
        mode: game.mode,
        betAmount: game.betAmount,
        playerHands,
        dealerHand: redactDealerHand(game.dealerHand as Card[]),
        activeHandIndex: game.activeHandIndex,
        legalActions: computeLegalActions(playerHands[game.activeHandIndex], game.mode, playerHands),
        winProbability,
      });
    } catch (error: any) {
      console.error("Error fetching active game:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Forfeits the player's active Classic-solo game when they deliberately leave the table
  // mid-hand (confirmed via a popup client-side). Unlike the orphaned-game refund in
  // /api/game/start (a safety net for an app crash/connection drop the player never chose),
  // this is an explicit "I'm leaving" action, so it settles every unresolved hand as a loss
  // instead of returning the bet — the whole point Anatole asked for is that leaving actually
  // costs you the bet.
  app.post("/api/game/forfeit", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const game = await storage.getActiveGameForUser(userId);
      if (!game) {
        return res.json({ success: true, forfeited: false });
      }

      const playerHands = (game.playerHands as PlayerHand[]).map(h =>
        h.result === null ? { ...h, status: "standing" as const, result: "lose" as const, payout: 0 } : h
      );

      await storage.updateActiveGame(game.id, {
        status: "completed",
        playerHands,
        resolvedAt: new Date(),
      });

      // No coin change here — the bet was already debited when the hand started; this just
      // confirms it's lost instead of leaving the game resumable/refundable.
      await recordGameSettlement(userId, game.mode, playerHands);

      res.json({ success: true, forfeited: true });
    } catch (error: any) {
      console.error("Error forfeiting active game:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Game stats routes
  app.post("/api/stats", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const statsData = insertGameStatsSchema.parse({
        ...req.body,
        userId,
      });

      const stats = await storage.createGameStats(statsData);

      // Same season-scoped rank counter as the server-authoritative game route — keeps
      // parity since gameStats.handsWon (which already includes these hands) is what
      // ranks were based on before the season split.
      await storage.addSeasonHandsWon(userId, statsData.handsWon || 0);

      // Mettre à jour la progression des challenges automatiquement
      const gameResult = {
        handsPlayed: statsData.handsPlayed || 0,
        handsWon: statsData.handsWon || 0,
        blackjacks: statsData.blackjacks || 0,
        coinsWon: (statsData.totalWinnings || 0) - (statsData.totalLosses || 0) // Gain net
      };

      const completedChallenges = await ChallengeService.updateChallengeProgress(userId, gameResult);

      // Système d'XP : +5 XP par victoire, +7 XP bonus par blackjack naturel (en plus du
      // gain de victoire normal)
      let xpResult;
      const xpPerWin = 5;
      const blackjackXpBonus = 7;
      const xpGained = ((statsData.handsWon || 0) * xpPerWin) + ((statsData.blackjacks || 0) * blackjackXpBonus);
      if (xpGained > 0) {
        xpResult = await storage.addXPToUser(userId, xpGained);
      }

      res.json({
        stats,
        completedChallenges: completedChallenges.length > 0 ? completedChallenges : undefined,
        xpGained,
        levelUp: xpResult?.leveledUp ? {
          newLevel: xpResult.user.level,
          rewards: xpResult.rewards
        } : undefined,
      });
    } catch (error: any) {
      console.error("Error creating game stats:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/stats/summary", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats((req.session as any).userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stats/coins-history", requireAuth, async (req, res) => {
    try {
      const range = req.query.range === "7d" || req.query.range === "30d" ? req.query.range : "24h";
      const history = await storage.getCoinsHistory((req.session as any).userId, range);
      res.json({ history });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Same two endpoints, scoped to a friend's stats instead of the caller's own — powers the
  // Friend Stats popup's chart/tiles. Gated on actually being friends (not just "logged in"),
  // same areFriends check the rest of the friends system already uses.
  app.get("/api/friends/:friendId/stats/summary", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { friendId } = req.params;
      if (!(await storage.areFriends(userId, friendId))) {
        return res.status(403).json({ message: "Not friends with this user" });
      }
      const stats = await storage.getUserStats(friendId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends/:friendId/stats/coins-history", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { friendId } = req.params;
      if (!(await storage.areFriends(userId, friendId))) {
        return res.status(403).json({ message: "Not friends with this user" });
      }
      const range = req.query.range === "7d" || req.query.range === "30d" ? req.query.range : "24h";
      const history = await storage.getCoinsHistory(friendId, range);
      res.json({ history });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Same two endpoints again, this time with no friendship gate at all — powers the Player
  // Stats popup when it's opened from the (already-public) Weekly Leaderboard, where the
  // tapped player is frequently a stranger. Still requireAuth so there's a session to attach
  // to, just nothing checked about the relationship between viewer and viewed.
  app.get("/api/users/:userId/stats/summary", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.params.userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:userId/stats/coins-history", requireAuth, async (req, res) => {
    try {
      const range = req.query.range === "7d" || req.query.range === "30d" ? req.query.range : "24h";
      const history = await storage.getCoinsHistory(req.params.userId, range);
      res.json({ history });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Classic Mode weekly win-streak leaderboard — open to every player, resets naturally
  // each week since entries are keyed by weekStartDate.
  app.get("/api/leaderboard/weekly-classic-streak", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const leaderboard = await storage.getWeeklyClassicStreakLeaderboard(limit, userId);
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Error fetching weekly classic streak leaderboard:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Weekly leaderboard — ranks players by net coins won/lost from play this week (see
  // addWeeklyXP's comment in storage.ts; route/field names still say "xp" from before this
  // was repurposed). Resets naturally each week since entries are keyed by weekStartDate.
  app.get("/api/leaderboard/weekly-xp", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const leaderboard = await storage.getWeeklyXpLeaderboard(limit, userId);
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Error fetching weekly XP leaderboard:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Current player's live rank/XP/prize this week, for the header rank badge and the "Your
  // current prize is X gems" subtitle — the player is usually outside the top-N list above.
  app.get("/api/leaderboard/weekly-xp/me", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const status = await storage.getMyWeeklyXpStatus(userId);
      res.json(status);
    } catch (error: any) {
      console.error("Error fetching my weekly XP status:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Read-only check for the "Claim your reward" button on the leaderboard page — tells the
  // client whether last week's top-3 gem reward is still there to claim, without crediting it
  // (that only happens via the POST route below, when the player actually taps Claim).
  app.get("/api/leaderboard/weekly-xp/pending-reward", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const pending = await storage.getPendingWeeklyXpReward(userId);
      res.json(pending);
    } catch (error: any) {
      console.error("Error fetching pending weekly XP reward:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Claims the gem reward for the player's rank in last week's XP leaderboard (top 3 only:
  // 50/25/10 gems). Safe to call any time — no-ops if not top 3 or already claimed.
  app.post("/api/leaderboard/weekly-xp/claim-reward", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const result = await storage.claimWeeklyXpLeaderboardReward(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error claiming weekly XP leaderboard reward:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Daily win-streak status (consecutive calendar days with a Classic-solo win) — the
  // streak itself is only ever advanced server-side from recordGameSettlement, this route
  // just reads it for the flame icon / streak popup.
  app.get("/api/daily-streak", requireAuth, async (req, res) => {
    try {
      const status = await storage.getDailyStreakStatus((req.session as any).userId);
      res.json(status);
    } catch (error: any) {
      console.error("Error fetching daily streak status:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Manually claims today's streak reward (players tap "Claim" in the streak popup — winning
  // the hand only makes it claimable, see recordDailyStreakWin, it never auto-credits).
  app.post("/api/daily-streak/claim", requireAuth, async (req, res) => {
    try {
      const result = await storage.claimDailyStreakReward((req.session as any).userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error claiming daily streak reward:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Daily spin routes
  // Watching a rewarded ad grants unlimited free spins - gated client-side by the AdMob flow,
  // not by a server-side daily cap.
  app.post("/api/daily-spin", requireAuth, async (req, res) => {
    try {
      const reward = EconomyManager.generateWheelOfFortuneReward();

      // Record spin
      await storage.createDailySpin({
        userId: (req.session as any).userId,
        reward: reward,
      });

      // Apply reward to user atomically
      await applySpinReward((req.session as any).userId, reward, true);
      // Counts toward the "free spin every 5 spins" bonus -- see the schema field's comment.
      await storage.incrementSpinsTowardBonusFreeSpin((req.session as any).userId);

      res.json({ reward });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // The one truly-free spin per day (no ad, no gems), resetting at a fixed hour Paris time -
  // tracked separately from the unlimited ad-gated spin above.
  app.get("/api/daily-spin/free/can-spin", requireAuth, async (req, res) => {
    try {
      const status = await storage.getFreeSpinStatus((req.session as any).userId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/daily-spin/free", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { canSpin } = await storage.getFreeSpinStatus(userId);
      if (!canSpin) {
        return res.status(400).json({ message: "Free spin already used today" });
      }

      const reward = EconomyManager.generateWheelOfFortuneReward();
      await storage.createFreeDailySpin(userId, reward);
      await applySpinReward(userId, reward, true);
      // Whichever of the two (daily timer or the every-5-spins bonus) made this spin
      // available, using it clears the bonus so it can't also carry over into tomorrow's
      // regular free spin on top of the timer resetting.
      await storage.updateUser(userId, { bonusFreeSpinAvailable: false });

      res.json({ reward });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Unified spin endpoints - canonical API
  app.get("/api/spin/status", requireAuth, async (req, res) => {
    try {
      const status = await storage.getSpinStatus((req.session as any).userId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/spin/perform", requireAuth, async (req, res) => {
    try {
      const canSpin = await storage.canUserSpin24h((req.session as any).userId);
      if (!canSpin) {
        return res.status(400).json({ message: "Already spun today" });
      }

      // Generate reward (using wheel of fortune logic for better rewards)
      const reward = EconomyManager.generateWheelOfFortuneReward();

      // Record spin using unified method
      await storage.createSpin((req.session as any).userId, reward);

      // Apply reward to user atomically
      await applySpinReward((req.session as any).userId, reward, false);

      res.json({ reward });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Wheel of Fortune routes
  app.get("/api/wheel-of-fortune/can-spin", requireAuth, async (req, res) => {
    try {
      const canSpin = await storage.canUserSpinWheel((req.session as any).userId);
      res.json({ canSpin });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/wheel-of-fortune/time-until-free-spin", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      // Get user's last spin from database (same logic as canUserSpinWheel)
      const userSpin = await db
        .select()
        .from(dailySpins)
        .where(eq(dailySpins.userId, userId))
        .limit(1);

      if (userSpin.length === 0 || !userSpin[0].lastSpinAt) {
        // User hasn't spun yet, can spin immediately
        return res.json({ canSpinNow: true, timeUntilNext: 0 });
      }

      const lastSpinDate = new Date(userSpin[0].lastSpinAt);
      const nextSpinTime = new Date(lastSpinDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
      const now = new Date();

      if (now >= nextSpinTime) {
        // Can spin now
        return res.json({ canSpinNow: true, timeUntilNext: 0 });
      } else {
        // Calculate time remaining
        const timeRemaining = nextSpinTime.getTime() - now.getTime();
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

        return res.json({
          canSpinNow: false,
          timeUntilNext: timeRemaining,
          hours,
          minutes,
          seconds
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/wheel-of-fortune/spin", requireAuth, async (req, res) => {
    try {
      // Always allow spin for free wheel since it simulates ads
      // We don't check canSpin to allow unlimited spins after ads

      // Use reward from request body if provided, otherwise generate random
      let reward;
      if (req.body && req.body.rewardType && req.body.rewardAmount) {
        reward = {
          type: req.body.rewardType,
          amount: req.body.rewardAmount
        };
      } else {
        reward = EconomyManager.generateWheelOfFortuneReward();
      }

      // Apply reward to user atomically
      await applySpinReward((req.session as any).userId, reward, false);

      res.json({ reward });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Premium wheel spin with gems
  app.post("/api/wheel-of-fortune/premium-spin", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has enough gems
      if ((user.gems || 0) < 10) {
        return res.status(400).json({ message: "Not enough gems. You need 10 gems to spin." });
      }

      // Generate reward server-side
      const reward = EconomyManager.generateWheelOfFortuneReward();

      // Deduct gems and apply reward atomically (or as close as possible with current storage)
      // First, calculate the new state
      const updates: any = {
        gems: (user.gems || 0) - 10  // Deduct 10 gems cost
      };

      // Apply reward
      switch (reward.type) {
        case 'coins':
          updates.coins = (user.coins || 0) + reward.amount!;
          break;
        case 'gems':
          // Add reward gems to the remaining balance (after deduction)
          updates.gems = updates.gems + reward.amount!;
          break;
        case 'swapTokens':
          updates.swapTokens = (user.swapTokens || 0) + reward.amount!;
          break;
        case 'xp': {
          // Keep in sync with storage.addXPToUser's incremental logic (see applySpinReward
          // for why deriving level from lifetime xp breaks the Battle Pass season reset).
          const currentLevel = user.level ?? 0;
          const currentLevelXP = user.currentLevelXP || 0;
          let newCurrentLevelXP = currentLevelXP + reward.amount!;
          let newLevel = currentLevel;
          while (newCurrentLevelXP >= 100) {
            newCurrentLevelXP -= 100;
            newLevel++;
          }
          updates.xp = (user.xp || 0) + reward.amount!;
          updates.currentLevelXP = newCurrentLevelXP;
          updates.level = newLevel;
          break;
        }
      }

      // Update user in database
      await storage.updateUser(userId, updates);
      // Counts toward the "free spin every 5 spins" bonus, same as the ad-watch spin.
      await storage.incrementSpinsTowardBonusFreeSpin(userId);

      // Log the transaction (optional but good for debugging)
      console.log(`User ${userId} spun premium wheel: -10 gems, +${reward.amount} ${reward.type}`);

      res.json({ reward });
    } catch (error: any) {
      console.error("Error in premium spin:", error);
      res.status(500).json({ message: error.message });
    }
  });


  // Leaderboard routes
  // Challenges endpoints
  app.get("/api/challenges", async (req, res) => {
    try {
      const challenges = await storage.getChallenges();
      res.json(challenges);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/challenges/user", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      // Get or create today's challenges
      const todaysChallenges = await ChallengeService.getTodaysChallenges();

      // Clean up old challenges and assign today's challenges to user
      await ChallengeService.refreshUserChallenges(userId, todaysChallenges);

      // Retrieve user's challenges (will only have today's challenges)
      const userChallenges = await storage.getUserChallenges(userId);
      res.json(userChallenges);
    } catch (error: any) {
      console.error("Error getting user challenges:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Route to get time remaining until next challenge reset
  app.get("/api/challenges/time-until-reset", async (req, res) => {
    try {
      const timeLeft = ChallengeService.getTimeUntilNextReset();
      res.json(timeLeft);
    } catch (error: any) {
      console.error("Error getting time until reset:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Route to claim challenge rewards
  app.post("/api/challenges/:challengeId/claim", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const challengeId = req.params.challengeId;

      console.log(`🎯 CLAIM DEBUG: User ${userId} attempting to claim challenge ${challengeId}`);

      const result = await ChallengeService.claimChallengeReward(userId, challengeId);

      console.log(`🎯 CLAIM RESULT: success=${result.success}, error=${result.error}, reward=${result.reward || 'none'}`);

      if (result.success) {
        res.json({
          success: true,
          reward: result.reward,
          message: `Successfully claimed ${result.reward} coins and ${CHALLENGE_XP_REWARD} XP!`
        });
      } else {
        console.error(`❌ CLAIM FAILED: ${result.error}`);
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error("Error claiming challenge reward:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Health check endpoint - verify system readiness (no auth required)
  app.get("/api/health/ready", async (req, res) => {
    res.status(200).json({ status: "healthy", message: "System ready for operations" });
  });

  // Route to force challenge reset (for testing/admin)
  app.post("/api/challenges/force-reset", async (req, res) => {
    try {
      // Clean up old challenges
      await ChallengeService.cleanupExpiredChallenges();

      // Create new challenges 
      const newChallenges = await ChallengeService.createDailyChallenges();

      // Les utilisateurs obtiendront automatiquement les nouveaux défis lors de leur prochaine requête
      res.json({
        message: "Défis réinitialisés avec succès",
        challenges: newChallenges,
        count: newChallenges.length
      });
    } catch (error: any) {
      console.error("Error forcing reset:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Initialize daily challenges (admin endpoint for testing)
  app.post("/api/challenges/init", async (req, res) => {
    try {
      const challenges = await ChallengeService.createDailyChallenges();
      res.json({ message: "Challenges created successfully", challenges });
    } catch (error: any) {
      console.error("Error creating challenges:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Season/Battlepass routes
  app.get("/api/seasons/current", async (req, res) => {
    try {
      const currentSeason = await storage.getCurrentSeason();
      res.json(currentSeason);
    } catch (error: any) {
      console.error("Error getting current season:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/seasons/time-remaining", async (req, res) => {
    try {
      const timeRemaining = SeasonService.getTimeUntilSeasonEnd();
      res.json(timeRemaining);
    } catch (error: any) {
      console.error("Error getting time until season end:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // New endpoint to check and reset season automatically
  app.get("/api/seasons/check-and-reset", async (req, res) => {
    try {
      const result = await SeasonService.checkAndResetIfNeeded();
      res.json(result);
    } catch (error: any) {
      console.error("Error checking/resetting season:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get current season info with auto-reset check
  app.get("/api/seasons/info", async (req, res) => {
    try {
      // Check and reset if needed first
      const resetResult = await SeasonService.checkAndResetIfNeeded();

      // Get the current season from database to ensure we have fresh data
      const currentSeason = await storage.getCurrentSeason();

      // Get time remaining
      const timeRemaining = SeasonService.getTimeUntilSeasonEnd();

      res.json({
        seasonName: currentSeason?.name || resetResult.seasonName,
        seasonId: currentSeason?.id || resetResult.seasonId,
        wasReset: resetResult.reset,
        timeRemaining,
        season: currentSeason
      });
    } catch (error: any) {
      console.error("Error getting season info:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/seasons/add-xp", requireAuth, async (req, res) => {
    try {
      const { amount } = req.body;
      const userId = (req.session as any).userId;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid XP amount" });
      }

      const updatedUser = await storage.addSeasonXPToUser(userId, amount);
      res.json({
        seasonXp: updatedUser.seasonXp,
        level: storage.calculateLevel(updatedUser.seasonXp || 0)
      });
    } catch (error: any) {
      console.error("Error adding season XP:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/seasons/reset", async (req, res) => {
    try {
      await storage.resetSeasonProgress();
      res.json({ message: "Season reset successfully" });
    } catch (error: any) {
      console.error("Error resetting season:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Battle Pass rewards routes - New system based on user levels
  app.post("/api/battlepass/claim-tier", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      // Validate request body with Zod
      const validationResult = claimBattlePassTierSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validationResult.error.errors
        });
      }

      const { tier, isPremium } = validationResult.data;

      // Get user and check if they exist
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has enough level for this tier
      const userLevel = user.level || 1;
      if (userLevel < tier) {
        return res.status(400).json({ message: `You need to reach level ${tier} to claim this tier` });
      }

      // CRITICAL SECURITY: Check if user is trying to claim premium reward
      if (isPremium) {
        // Check premium status - user is premium if they have either:
        // 1. Premium membership type, OR
        // 2. Valid subscription that hasn't expired
        const hasValidMembership = user.membershipType === 'premium';
        const hasValidSubscription = user.subscriptionExpiresAt &&
          new Date(user.subscriptionExpiresAt) > new Date();

        if (!hasValidMembership && !hasValidSubscription) {
          console.warn(`Security violation: User ${userId} attempted to claim premium reward without valid subscription. Membership: ${user.membershipType}, Expires: ${user.subscriptionExpiresAt}`);
          return res.status(403).json({
            message: "Premium subscription required to claim premium rewards",
            code: "PREMIUM_REQUIRED"
          });
        }

        console.log(`Premium validation passed for user ${userId}: membership=${user.membershipType}, expires=${user.subscriptionExpiresAt}`);
      }

      // Use current season ID
      const currentSeason = await storage.getCurrentSeason();
      if (!currentSeason) {
        return res.status(404).json({ message: "No active season found" });
      }
      const seasonId = currentSeason.id;

      const rewards = await storage.claimBattlePassTier(userId, seasonId, tier, isPremium);

      // Return updated user data with multi-reward format
      const updatedUser = await storage.getUser(userId);
      const rewardsSummary = rewards.rewards.map((r) => `${r.amount} ${r.kind}`).join(', ')
        || rewards.cardBack?.name || rewards.avatar?.name || rewards.emote?.name || 'nothing';
      res.json({
        reward: rewards, // { chestTier, rewards: [{kind, amount}], cardBack, avatar, emote }
        user: updatedUser,
        message: `Successfully claimed ${isPremium ? 'premium' : 'free'} reward for tier ${tier}: ${rewards.chestTier} chest - ${rewardsSummary}`
      });
    } catch (error: any) {
      console.error("Error claiming Battle Pass tier:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/battlepass/claimed-tiers", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      // Use current season ID
      const currentSeason = await storage.getCurrentSeason();
      if (!currentSeason) {
        return res.status(404).json({ message: "No active season found" });
      }
      const seasonId = currentSeason.id;

      const claimedTiers = await storage.getClaimedBattlePassTiers(userId, seasonId);
      res.json(claimedTiers); // Now returns {freeTiers: [], premiumTiers: []}
    } catch (error: any) {
      console.error("Error getting claimed Battle Pass tiers:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Shop routes
  app.get("/api/shop/items", (req, res) => {
    try {
      const items = EconomyManager.getShopItems();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/shop/purchase", requireAuth, async (req, res) => {
    try {
      const { itemType, itemId, currency, price } = req.body;

      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user can afford
      if (!EconomyManager.canAfford(user.coins || 0, user.gems || 0, price, currency)) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      // Deduct currency
      const updates: any = {};
      if (currency === 'coins') {
        updates.coins = (user.coins || 0) - price;
      } else {
        updates.gems = (user.gems || 0) - price;
      }

      await storage.updateUser((req.session as any).userId, updates);

      // Add item to inventory
      await storage.createInventory({
        userId: (req.session as any).userId,
        itemType,
        itemId,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Inventory routes
  app.get("/api/inventory", requireAuth, async (req, res) => {
    try {
      const inventory = await storage.getUserInventory((req.session as any).userId);
      res.json(inventory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Achievement routes
  app.get("/api/achievements", requireAuth, async (req, res) => {
    try {
      const achievements = await storage.getUserAchievements((req.session as any).userId);
      res.json(achievements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const SUBSCRIPTION_PRICES: Record<string, number> = { monthly: 3.99, annual: 24.99 };

  app.get("/api/subscription/status", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let isActive = false;
      let expiresAt = null;

      // Vérifier le statut de l'abonnement
      if (user.membershipType === 'premium' && user.subscriptionExpiresAt) {
        const now = new Date();
        const expiryDate = new Date(user.subscriptionExpiresAt);
        isActive = expiryDate > now;
        expiresAt = user.subscriptionExpiresAt;

        // Si l'abonnement est expiré, le rétrograder en normal
        if (!isActive) {
          await storage.updateUser(userId, {
            membershipType: 'normal',
            subscriptionExpiresAt: null,
            subscriptionStartedAt: null,
            subscriptionPlan: null,
            subscriptionCancelAtPeriodEnd: false,
            subscriptionCancelReason: null,
            subscriptionDiscounted: false,
          });
        }
      }

      const plan = isActive ? user.subscriptionPlan : null;
      const basePrice = plan ? SUBSCRIPTION_PRICES[plan] ?? null : null;
      const discounted = isActive && !!user.subscriptionDiscounted;

      res.json({
        membershipType: isActive ? 'premium' : 'normal',
        isActive,
        expiresAt,
        plan,
        price: basePrice != null ? (discounted ? Math.round(basePrice * 50) / 100 : basePrice) : null,
        cancelAtPeriodEnd: isActive ? !!user.subscriptionCancelAtPeriodEnd : false,
        discounted,
        subscribedSince: isActive ? user.subscriptionStartedAt : null,
      });
    } catch (error: any) {
      console.error('Erreur vérification statut:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mock "purchase" — in this app's current state there is no real payment provider wired
  // up (no Stripe/RevenueCat/IAP anywhere), so this just activates Premium locally the same
  // way the rest of the Premium/Battle Pass flow already mocks purchases.
  app.post("/api/subscription/subscribe", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const plan = req.body?.plan === 'annual' ? 'annual' : 'monthly';
      const now = new Date();
      const expiresAt = new Date(now);
      if (plan === 'annual') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      else expiresAt.setMonth(expiresAt.getMonth() + 1);

      await storage.updateUser(userId, {
        membershipType: 'premium',
        subscriptionExpiresAt: expiresAt,
        // Downgrading back to normal clears this (see /api/subscription/status), so it always
        // starts fresh here -- the billing history recap below only ever covers a single
        // continuous subscription, never spans a lapsed/cancelled gap.
        subscriptionStartedAt: now,
        subscriptionPlan: plan,
        subscriptionCancelAtPeriodEnd: false,
        subscriptionCancelReason: null,
        subscriptionDiscounted: false,
      });

      res.json({ membershipType: 'premium', isActive: true, expiresAt: expiresAt.toISOString(), plan });
    } catch (error: any) {
      console.error('Erreur souscription:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancels at the end of the already-paid period rather than immediately: access
  // (membershipType/subscriptionExpiresAt) is left untouched here, only the
  // cancel-at-period-end flag is set. GET /api/subscription/status is what actually
  // downgrades the user, once subscriptionExpiresAt has passed.
  app.post("/api/subscription/cancel", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user || user.membershipType !== 'premium') {
        return res.status(400).json({ error: "No active subscription to cancel" });
      }

      const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null;

      await storage.updateUser(userId, {
        subscriptionCancelAtPeriodEnd: true,
        subscriptionCancelReason: reason,
      });

      res.json({ cancelAtPeriodEnd: true, expiresAt: user.subscriptionExpiresAt });
    } catch (error: any) {
      console.error('Erreur résiliation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Undoes a pending cancellation — subscription keeps renewing as before.
  app.post("/api/subscription/resume", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user || user.membershipType !== 'premium') {
        return res.status(400).json({ error: "No active subscription to resume" });
      }

      await storage.updateUser(userId, {
        subscriptionCancelAtPeriodEnd: false,
        subscriptionCancelReason: null,
      });

      res.json({ cancelAtPeriodEnd: false });
    } catch (error: any) {
      console.error('Erreur reprise abonnement:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Retention offer accepted from the cancel flow: -50% instead of cancelling.
  app.post("/api/subscription/apply-discount", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user || user.membershipType !== 'premium') {
        return res.status(400).json({ error: "No active subscription" });
      }
      if (user.subscriptionDiscounted) {
        return res.status(400).json({ error: "Discount already applied" });
      }

      await storage.updateUser(userId, {
        subscriptionDiscounted: true,
        subscriptionCancelAtPeriodEnd: false,
        subscriptionCancelReason: null,
      });

      const basePrice = user.subscriptionPlan ? SUBSCRIPTION_PRICES[user.subscriptionPlan] ?? null : null;
      res.json({
        discounted: true,
        cancelAtPeriodEnd: false,
        price: basePrice != null ? Math.round(basePrice * 50) / 100 : null,
      });
    } catch (error: any) {
      console.error('Erreur application réduction:', error);
      res.status(500).json({ error: error.message });
    }
  });
  // Card Back routes
  app.get("/api/card-backs", async (req, res) => {
    try {
      const cardBacks = await storage.getAllCardBacks();
      res.json({ success: true, data: cardBacks });
    } catch (error: any) {
      console.error("Error fetching card backs:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to fetch card backs" });
    }
  });

  app.get("/api/user/card-backs", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: "User not authenticated" });
      }

      const userCardBacks = await storage.getUserCardBacks(userId);

      // Ensure we have valid data before sorting
      if (!Array.isArray(userCardBacks)) {
        console.error("getUserCardBacks returned non-array:", userCardBacks);
        return res.json({ success: true, data: [] });
      }

      // Sort by rarity: COMMON → RARE → SUPER_RARE → LEGENDARY
      const rarityOrder = { COMMON: 1, RARE: 2, SUPER_RARE: 3, LEGENDARY: 4 };
      const sortedCardBacks = userCardBacks
        .filter(item => item && item.cardBack) // Additional safety filter
        .sort((a, b) => {
          const rarityA = rarityOrder[a.cardBack?.rarity as keyof typeof rarityOrder] || 5;
          const rarityB = rarityOrder[b.cardBack?.rarity as keyof typeof rarityOrder] || 5;
          return rarityA - rarityB;
        });

      res.json({ success: true, data: sortedCardBacks });
    } catch (error: any) {
      console.error("Error fetching user card backs:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to fetch user card backs" });
    }
  });

  // Emotes a user has unlocked (as chest rewards — see storage.openChest/claimBattlePassTier).
  // Just ids/source/acquiredAt — the client resolves name/image against
  // client/src/data/emotes.ts's own copy of the shared catalog.
  app.get("/api/user/emotes", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const emotes = await storage.getUserEmotes(userId);
      res.json({ success: true, data: emotes });
    } catch (error: any) {
      console.error("Error fetching user emotes:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to fetch user emotes" });
    }
  });

  app.patch("/api/user/selected-card-back", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      // Validate request body with Zod
      const validation = selectCardBackSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: validation.error.errors.map(e => e.message).join(", ")
        });
      }

      const { cardBackId } = validation.data;

      // Check if user owns this card back (skip check for default/classic card back)
      if (cardBackId !== 'default' && cardBackId !== 'classic') {
        const hasCardBack = await storage.hasUserCardBack(userId, cardBackId);
        if (!hasCardBack) {
          return res.status(403).json({
            success: false,
            error: "You don't own this card back. Purchase it first to use it."
          });
        }
      }

      // Update user's selected card back
      const updatedUser = await storage.updateUserSelectedCardBack(userId, cardBackId);

      res.json({
        success: true,
        data: {
          selectedCardBackId: updatedUser.selectedCardBackId,
          message: "Card back selection updated successfully"
        }
      });
    } catch (error: any) {
      console.error("Error updating selected card back:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to update selected card back" });
    }
  });

  app.get("/api/user/selected-card-back", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // If no custom card back selected or using classic/default, return null for default classic card back
      if (!user.selectedCardBackId || user.selectedCardBackId === "classic" || user.selectedCardBackId === "default") {
        res.json({
          success: true,
          data: {
            selectedCardBackId: null,
            cardBack: null
          }
        });
        return;
      }

      // Get the selected custom card back details
      const cardBack = await storage.getCardBack(user.selectedCardBackId);

      if (!cardBack) {
        return res.status(404).json({ success: false, error: "Selected card back not found" });
      }

      res.json({
        success: true,
        data: {
          selectedCardBackId: user.selectedCardBackId,
          cardBack
        }
      });
    } catch (error: any) {
      console.error("Error fetching selected card back:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to fetch selected card back" });
    }
  });





  // Friends API routes
  app.get("/api/friends/search", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { q: query } = req.query;

      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }

      const users = await storage.searchUsersByUsername(query.trim(), userId);
      res.json({ users });
    } catch (error: any) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/friends/request", requireAuth, requireCSRF, async (req, res) => {
    try {
      const requesterId = (req.session as any).userId;
      const { recipientId } = req.body;

      if (!recipientId) {
        return res.status(400).json({ message: "Recipient ID is required" });
      }

      if (requesterId === recipientId) {
        return res.status(400).json({ message: "Cannot send friend request to yourself" });
      }

      const friendship = await storage.sendFriendRequest(requesterId, recipientId);
      res.json({ success: true, friendship });

      // Best-effort push — never let a notification failure affect the friend request
      // itself, which has already succeeded and been returned to the caller above.
      try {
        const recipient = await storage.getUser(recipientId);
        if (recipient?.pushToken) {
          const requester = await storage.getUser(requesterId);
          await sendPushNotification(recipient.pushToken, {
            title: "FaceUp",
            body: `${requester?.username ?? "Someone"} sent you a friend request`,
          });
        }
      } catch (pushError) {
        console.error("Error sending friend request push notification:", pushError);
      }
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      if (error.message.includes("already exists")) {
        return res.status(409).json({ message: "Friend request already exists or you are already friends" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/friends/accept", requireAuth, requireCSRF, async (req, res) => {
    try {
      const recipientId = (req.session as any).userId;
      const { requesterId } = req.body;

      if (!requesterId) {
        return res.status(400).json({ message: "Requester ID is required" });
      }

      const friendship = await storage.acceptFriendRequest(requesterId, recipientId);
      res.json({ success: true, friendship });

      // Best-effort push — never let a notification failure affect the acceptance itself,
      // which has already succeeded and been returned to the caller above.
      try {
        const requester = await storage.getUser(requesterId);
        if (requester?.pushToken) {
          const recipient = await storage.getUser(recipientId);
          await sendPushNotification(requester.pushToken, {
            title: "FaceUp",
            body: `${recipient?.username ?? "Someone"} accepted your friend request`,
            data: { type: "friend_request_accepted" },
          });
        }
      } catch (pushError) {
        console.error("Error sending friend-accept push notification:", pushError);
      }
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: "Friend request not found or already processed" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/friends/reject", requireAuth, requireCSRF, async (req, res) => {
    try {
      const recipientId = (req.session as any).userId;
      const { requesterId } = req.body;

      if (!requesterId) {
        return res.status(400).json({ message: "Requester ID is required" });
      }

      await storage.rejectFriendRequest(requesterId, recipientId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error rejecting friend request:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/friends/remove", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { friendId } = req.body;

      if (!friendId) {
        return res.status(400).json({ message: "Friend ID is required" });
      }

      await storage.removeFriend(userId, friendId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing friend:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const friends = await storage.getUserFriends(userId);
      res.json({ friends });
    } catch (error: any) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends/requests", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const requests = await storage.getFriendRequests(userId);
      res.json({ requests });
    } catch (error: any) {
      console.error("Error fetching friend requests:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends/check", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { friendId } = req.query;

      if (!friendId || typeof friendId !== 'string') {
        return res.status(400).json({ message: "Friend ID is required" });
      }

      const areFriends = await storage.areFriends(userId, friendId);
      res.json({ areFriends });
    } catch (error: any) {
      console.error("Error checking friendship:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Block/report a player (Apple App Store Guideline 1.2 — UGC moderation). Blocking also
  // severs any friendship/pending request between them (see storage.blockUser) and hides each
  // from the other in friend search and both leaderboards.
  app.post("/api/users/:userId/block", requireAuth, requireCSRF, async (req, res) => {
    try {
      const blockerId = (req.session as any).userId;
      const { userId: blockedId } = req.params;

      if (blockerId === blockedId) {
        return res.status(400).json({ message: "Cannot block yourself" });
      }

      await storage.blockUser(blockerId, blockedId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error blocking user:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users/:userId/unblock", requireAuth, requireCSRF, async (req, res) => {
    try {
      const blockerId = (req.session as any).userId;
      const { userId: blockedId } = req.params;

      await storage.unblockUser(blockerId, blockedId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // No admin panel yet — a report is just recorded for manual review, same "not overbuilt"
  // approach as the rest of this endpoint (see storage.reportUser's own comment).
  app.post("/api/users/:userId/report", requireAuth, requireCSRF, async (req, res) => {
    try {
      const reporterId = (req.session as any).userId;
      const { userId: reportedId } = req.params;
      const { reason } = req.body;

      if (reporterId === reportedId) {
        return res.status(400).json({ message: "Cannot report yourself" });
      }
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({ message: "A reason is required" });
      }

      await storage.reportUser(reporterId, reportedId, reason.trim());
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error reporting user:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Play with Friends — lobby only for now (create/join a table, invite friends, see seats
  // fill live). No shared hand/turn logic yet — see the plan for the follow-up.
  app.post("/api/tables", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      const existing = await storage.getUserActiveTable(userId);
      if (existing) {
        // Force-quitting the app mid-game (any status — waiting, betting, in_progress) orphans
        // the table server-side, since nothing ever calls /leave. Getting stuck redirected back
        // to that dead table forever (or worse, dropped straight into its in-progress hand,
        // skipping the lobby/betting screens entirely) is exactly the bug this avoids: an
        // explicit "Create a game" always means "start fresh," so the old seat is abandoned
        // (leaveTable forfeits any confirmed bet, dealt or not) rather than
        // resumed.
        await storage.leaveTable(existing.id, userId).catch(() => {});
      }

      const { table, seats } = await storage.createGameTable(userId, "classic");
      res.json({ table, seats });
    } catch (error: any) {
      console.error("Error creating table:", error);
      res.status(500).json({ message: error.message || "Failed to create table" });
    }
  });

  // Joins a table via its shareable code — no friendship or invite needed, unlike
  // /api/tables/:id/invite. The code itself is the only proof required, same trust model as
  // a real table's "whoever has the code can sit down."
  app.post("/api/tables/join-by-code", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const rawCode = req.body.code;
      if (!rawCode || typeof rawCode !== "string") {
        return res.status(400).json({ message: "Code is required" });
      }
      const code = rawCode.trim().toUpperCase();

      const existing = await storage.getUserActiveTable(userId);
      if (existing) {
        // Same reasoning as POST /api/tables: an explicit "join another table" action always
        // abandons whatever table a force-quit left this account orphaned in, regardless of
        // its status, instead of getting stuck redirecting back to it.
        await storage.leaveTable(existing.id, userId).catch(() => {});
      }

      const { tableId, seat } = await storage.joinTableByCode(code, userId);
      broadcastTableUpdate(tableId);
      res.json({ success: true, tableId, seat });
    } catch (error: any) {
      console.error("Error joining table by code:", error);
      if (error.message?.includes("No table found") || error.message?.includes("no longer available") || error.message?.includes("full") || error.message?.includes("already seated")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Failed to join table" });
    }
  });

  // Must stay registered before GET /api/tables/:id below - otherwise Express matches that
  // route first with id="invites", which fails as an invalid UUID.
  app.get("/api/tables/invites", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const invites = await storage.getPendingInvitesForUser(userId);
      res.json({ invites });
    } catch (error: any) {
      console.error("Error fetching table invites:", error);
      res.status(500).json({ message: error.message || "Failed to fetch invites" });
    }
  });

  app.get("/api/tables/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { id } = req.params;

      const result = await storage.getGameTableWithSeats(id);
      if (!result) {
        return res.status(404).json({ message: "Table not found" });
      }
      if (!result.seats.some((s) => s.userId === userId)) {
        return res.status(403).json({ message: "You're not seated at this table" });
      }

      // The deck itself (remaining cards, in draw order) must never reach the client — same
      // rule as active_games — and the dealer's hole card stays hidden while a hand is still
      // being played, exactly like single-player. Reopening a betting round only flips status
      // to "betting"; it doesn't clear the previous round's dealerHand column (that only gets
      // overwritten once the new hand is actually dealt), so without this the last hand's
      // dealer cards would leak into the fresh betting screen.
      const { deck, dealerHand, ...tableWithoutDeck } = result.table;
      const visibleDealerHand =
        result.table.status === "betting"
          ? null
          : dealerHand && result.table.status === "in_progress"
            ? redactDealerHand(dealerHand as Card[])
            : dealerHand;

      // Drives whether Play with Friends' Swap button lights up — same "first decision, not
      // yet swapped" window as Classic solo's GET /api/game/active (see handStrength.ts), just
      // simulated against my own seat's hand instead of the solo activeGames row. Only my own
      // seat needs this; other seats' swap eligibility never renders on my screen.
      const mySeat = result.seats.find((s) => s.userId === userId);
      const myHand = mySeat?.hand as PlayerHand | null;
      const swapWindow =
        result.table.status === "in_progress" &&
        myHand?.status === "active" &&
        myHand.cards.length === 2 &&
        !myHand.swapped;
      const winProbability = swapWindow
        ? simulateWinProbability(myHand!.cards, (dealerHand as Card[])[0], deck as Card[])
        : undefined;

      res.json({
        table: {
          ...tableWithoutDeck,
          dealerHand: visibleDealerHand,
        },
        seats: result.seats,
        winProbability,
      });
    } catch (error: any) {
      console.error("Error fetching table:", error);
      res.status(500).json({ message: error.message || "Failed to fetch table" });
    }
  });

  // Every seated player must confirm a bet before the table deals; see the plan for why
  // betting is independent per seat. There's no separate "start the hand" step — whoever's
  // first to bet after a hand settles is what reopens the betting round (see placeTableBet).
  app.post("/api/tables/:id/bet", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { id: tableId } = req.params;
      const amount = Math.floor(Number(req.body.amount));

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid bet amount" });
      }

      const { settled } = await storage.placeTableBet(tableId, userId, amount);
      broadcastTableUpdate(tableId);
      res.json({ success: true, settled });

      if (settled) {
        await recordTableHandSettlement(tableId);
      }
    } catch (error: any) {
      console.error("Error placing table bet:", error);
      if (error.message?.includes("Insufficient funds") || error.message?.includes("not seated") || error.message?.includes("already placed") || error.message?.includes("taking bets") || error.message?.includes("friend to join")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Failed to place bet" });
    }
  });

  // Relays an equipped emote to everyone else seated at the table, live — nothing persisted
  // (see broadcastEmote), so this is just an auth + "are you actually at this table" check
  // before relaying whatever emote id the client sent. The id itself isn't checked against the
  // catalog: the receiving client only ever renders it after looking it up in EMOTE_CATALOG
  // client-side, so an unrecognized id just renders nothing rather than anything unsafe.
  app.post("/api/tables/:id/emote", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { id: tableId } = req.params;
      const emoteId = typeof req.body.emoteId === "string" ? req.body.emoteId.trim() : "";

      if (!emoteId || emoteId.length > 64) {
        return res.status(400).json({ message: "Invalid emote" });
      }

      const activeTable = await storage.getUserActiveTable(userId);
      if (!activeTable || activeTable.id !== tableId) {
        return res.status(400).json({ message: "Not seated at this table" });
      }

      broadcastEmote(tableId, userId, emoteId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending table emote:", error);
      res.status(500).json({ message: error.message || "Failed to send emote" });
    }
  });

  // Marks that I've personally moved past my own result sheet for the hand that just settled —
  // see storage.acknowledgeTableResult for why this is separate from actually placing the next
  // bet: the client needs to know when *every* seated player has done this, not just me, before
  // showing the bet button as ready rather than still waiting on someone else.
  app.post("/api/tables/:id/acknowledge-result", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { id: tableId } = req.params;

      await storage.acknowledgeTableResult(tableId, userId);
      broadcastTableUpdate(tableId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error acknowledging table result:", error);
      if (error.message?.includes("not seated") || error.message?.includes("not found")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Failed to acknowledge result" });
    }
  });

  // Play with Friends' "watch an ad to double your win" claim — mirrors POST
  // /api/game/double-reward above, just against a table seat's `hand` instead of an
  // activeGames row. Shares that same route's daily counter (users.doubleRewardAdsWatched),
  // so the 3/day limit is genuinely per-account across every mode, not per mode.
  app.post("/api/tables/:id/double-reward", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { id: tableId } = req.params;

      const { status, ...body } = await storage.doubleTableSeatReward(tableId, userId);
      if (status !== 200) {
        return res.status(status).json(body);
      }
      res.json({ success: true, ...body });
    } catch (error: any) {
      console.error("Error doubling table reward:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tables/:id/action", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { id: tableId } = req.params;
      const { action } = req.body;

      if (!["hit", "stand", "double", "surrender"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      const { settled } = await storage.applyTableAction(tableId, userId, action);
      broadcastTableUpdate(tableId);
      res.json({ success: true, settled });

      if (settled) {
        await recordTableHandSettlement(tableId);
      }
    } catch (error: any) {
      console.error("Error applying table action:", error);
      if (error.message?.includes("not your turn") || error.message?.includes("Illegal action") || error.message?.includes("Insufficient funds") || error.message?.includes("No hand in progress")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Failed to apply action" });
    }
  });

  // SWAP — Play with Friends. Mirrors POST /api/game/swap (see its own comment for the full
  // rules); the only difference is it must be my turn, same as hit/stand/double/surrender above,
  // since this table's hand is played out one seat at a time rather than solo's single hand.
  app.post("/api/tables/:id/swap", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { id: tableId } = req.params;
      const { viaAd } = req.body as { viaAd?: boolean };

      const result = await storage.applyTableSwap(tableId, userId, !!viaAd);
      if (result.status !== 200) {
        return res.status(result.status).json({ message: result.message });
      }

      broadcastTableUpdate(tableId);
      res.json({ success: true, settled: result.settled, swapTokens: result.swapTokens });

      if (result.settled) {
        await recordTableHandSettlement(tableId);
      }
    } catch (error: any) {
      console.error("Error swapping table hand:", error);
      res.status(500).json({ message: error.message || "Failed to swap" });
    }
  });

  app.post("/api/tables/:id/invite", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { id: tableId } = req.params;
      const { friendId } = req.body;

      if (!friendId || typeof friendId !== "string") {
        return res.status(400).json({ message: "friendId is required" });
      }

      const result = await storage.getGameTableWithSeats(tableId);
      if (!result) {
        return res.status(404).json({ message: "Table not found" });
      }
      const { table, seats } = result;

      if (table.status === "in_progress" || table.status === "closed") {
        return res.status(400).json({ message: "This table is no longer accepting players" });
      }
      if (!seats.some((s) => s.userId === userId)) {
        return res.status(403).json({ message: "You're not seated at this table" });
      }
      if (seats.filter((s) => s.position !== "bottom").length >= 2) {
        return res.status(400).json({ message: "This table is full" });
      }
      if (seats.some((s) => s.userId === friendId)) {
        return res.status(400).json({ message: "That friend is already seated at this table" });
      }
      if (!(await storage.areFriends(userId, friendId))) {
        return res.status(400).json({ message: "You can only invite friends" });
      }

      const invite = await storage.createTableInvite(tableId, userId, friendId);
      broadcastTableUpdate(tableId);
      res.json({ success: true, invite });

      // Best-effort push — never let a notification failure affect the invite itself, which
      // has already succeeded and been returned to the caller above. Tapping the notification
      // accepts the invite and drops the recipient straight into the table (see
      // pushNotificationActionPerformed in client/src/lib/pushNotifications.ts) — there's no
      // in-app invite list to check back on otherwise.
      try {
        const friend = await storage.getUser(friendId);
        if (friend?.pushToken) {
          const inviter = await storage.getUser(userId);
          await sendPushNotification(friend.pushToken, {
            title: "FaceUp",
            body: `${inviter?.username ?? "A friend"} invited you to play blackjack`,
            data: { type: "table_invite", inviteId: invite.id, tableId },
          });
        }
      } catch (pushError) {
        console.error("Error sending table invite push notification:", pushError);
      }
    } catch (error: any) {
      console.error("Error inviting to table:", error);
      res.status(500).json({ message: error.message || "Failed to invite" });
    }
  });

  app.post("/api/tables/invites/:id/accept", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { id: inviteId } = req.params;

      const existingTable = await storage.getUserActiveTable(userId);
      if (existingTable) {
        // Same reasoning as POST /api/tables: abandon whatever orphaned table a force-quit
        // left this account in, regardless of status, instead of blocking on it.
        await storage.leaveTable(existingTable.id, userId).catch(() => {});
      }

      const { tableId, seat } = await storage.acceptTableInvite(inviteId, userId);
      broadcastTableUpdate(tableId);
      res.json({ success: true, tableId, seat });
    } catch (error: any) {
      console.error("Error accepting table invite:", error);
      if (error.message?.includes("not found") || error.message?.includes("no longer") || error.message?.includes("full") || error.message?.includes("already seated")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Failed to accept invite" });
    }
  });

  app.post("/api/tables/invites/:id/decline", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { id: inviteId } = req.params;

      const invite = await storage.getTableInvite(inviteId);
      if (!invite || invite.inviteeUserId !== userId) {
        return res.status(404).json({ message: "Invite not found" });
      }

      await storage.updateTableInviteStatus(inviteId, "declined");
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error declining table invite:", error);
      res.status(500).json({ message: error.message || "Failed to decline invite" });
    }
  });

  // Leaving works at any point, including mid-hand — any confirmed bet is forfeited, dealt or
  // not, and the hand keeps going for whoever's left, host or not; only the very last person
  // leaving actually closes the table. See storage.leaveTable.
  app.post("/api/tables/:id/leave", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { id: tableId } = req.params;

      const { settled } = await storage.leaveTable(tableId, userId);
      broadcastTableUpdate(tableId);
      res.json({ success: true });

      if (settled) {
        await recordTableHandSettlement(tableId);
      }
    } catch (error: any) {
      console.error("Error leaving table:", error);
      if (error.message?.includes("not found") || error.message?.includes("not seated")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Failed to leave table" });
    }
  });

  // Temporary debugging aid while getting push working for the first time on a device with
  // no attached Mac (no way to see the WKWebView's console otherwise) — just echoes
  // whatever the client's push registration flow reported into Render's own logs.
  app.post("/api/push/log-client-event", requireAuth, requireCSRF, async (req, res) => {
    const userId = (req.session as any).userId;
    console.log(`📱 [push-client] user=${userId} stage=${req.body?.stage} detail=${req.body?.detail}`);
    res.json({ success: true });
  });

  // Push notifications — direct APNs (see server/utils/apns.ts). One device token per user
  // for this first pass; just enough to prove a real push arrives via a self-serve test
  // button in Settings, before building notification content for specific app events.
  app.post("/api/push/register-token", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { token, platform } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "token is required" });
      }
      await storage.updateUser(userId, {
        pushToken: token,
        pushPlatform: typeof platform === "string" ? platform : null,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error registering push token:", error);
      res.status(500).json({ message: error.message || "Failed to register push token" });
    }
  });

  app.post("/api/push/test", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user?.pushToken) {
        return res.status(400).json({ message: "Enable notifications first" });
      }

      await sendPushNotification(user.pushToken, {
        title: "FaceUp",
        body: "Push notifications are working!",
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending test push:", error);
      res.status(500).json({ message: error.message || "Failed to send test push" });
    }
  });

  // Referral endpoints
  app.post("/api/referral/submit-code", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      // Validate request body with Zod
      const { code } = submitReferralCodeSchema.parse(req.body);

      // Normalize code to uppercase (already validated by schema)
      const normalizedCode = code.toUpperCase().trim();

      // A referred user can only ever have one referrer — no time limit on entering a code.
      const canEnter = await canEnterReferralCode(userId);
      if (!canEnter) {
        return res.status(400).json({ message: "You have already entered a referral code" });
      }

      // Validate the referral code
      const referrerId = await validateReferralCode(normalizedCode);
      if (!referrerId) {
        return res.status(404).json({ message: "Invalid referral code" });
      }

      // Check if user is trying to use their own code
      if (referrerId === userId) {
        return res.status(400).json({ message: "You cannot use your own referral code" });
      }

      // ATOMIC TRANSACTION: link the referrer, credit the new user's signup bonus immediately,
      // and increment the referrer's count. The referrer's own bonus is separate — it's only
      // credited later, when this user makes their first real-money purchase (see
      // awardFirstPurchaseReferralBonus in server/utils/referral-rewards.ts).
      const { coins: newCoinsBalance } = await db.transaction(async (tx: any) => {
        // Only set referred_by if it's still NULL — prevents a user from switching referrers
        // (one referrer per referred user) under a concurrent request.
        const updateResult = await tx.update(users)
          .set({
            referredBy: referrerId,
            coins: sql`${users.coins} + ${REFEREE_SIGNUP_REWARD_COINS}`,
          })
          .where(and(
            eq(users.id, userId),
            sql`${users.referredBy} IS NULL`
          ))
          .returning({ id: users.id, coins: users.coins });

        // If no rows were updated, user already has a referrer
        if (updateResult.length === 0) {
          throw new Error("You have already entered a referral code");
        }

        // Increment referrer's referral count — a referrer can have any number of referred
        // users, each tracked independently.
        await tx.update(users)
          .set({
            referralCount: sql`${users.referralCount} + 1`
          })
          .where(eq(users.id, referrerId));

        return updateResult[0];
      });

      res.json({
        success: true,
        coinsAwarded: REFEREE_SIGNUP_REWARD_COINS,
        remainingCoins: newCoinsBalance,
        message: `Referral code accepted! You earned ${REFEREE_SIGNUP_REWARD_COINS} coins. Your friend gets their reward when you make your first purchase.`
      });

      // Best-effort push — never let a notification failure affect the code submission
      // itself, which has already succeeded and been returned to the caller above.
      try {
        const referrer = await storage.getUser(referrerId);
        if (referrer?.pushToken) {
          const newUser = await storage.getUser(userId);
          await sendPushNotification(referrer.pushToken, {
            title: "FaceUp",
            body: `${newUser?.username ?? "Someone"} used your referral code`,
            data: { type: "referral_code_used" },
          });
        }
      } catch (pushError) {
        console.error("Error sending referral code push notification:", pushError);
      }
    } catch (error: any) {
      console.error("Error submitting referral code:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/referral/info", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      const user = await db.select({
        referralCode: users.referralCode,
        referralCount: users.referralCount,
        referredBy: users.referredBy,
      }).from(users).where(eq(users.id, userId)).limit(1);

      if (!user[0]) {
        return res.status(404).json({ message: "User not found" });
      }

      // A referred user can only ever have one referrer — no time limit on entering a code.
      const canEnterCode = !user[0].referredBy;

      res.json({
        referralCode: user[0].referralCode,
        referralCount: user[0].referralCount || 0,
        hasReferrer: !!user[0].referredBy,
        canEnterCode: canEnterCode,
      });
    } catch (error: any) {
      console.error("Error fetching referral info:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Note: Server creation is handled in server/index.ts
  // This function only registers routes on the Express app
}
