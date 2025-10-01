import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertGameStatsSchema, insertInventorySchema, insertDailySpinSchema, insertBattlePassRewardSchema, dailySpins, claimBattlePassTierSchema, selectCardBackSchema, insertBetDraftSchema, betPrepareSchema, betCommitSchema, users, betDrafts } from "@shared/schema";
// Neon/Drizzle imports removed - all DB operations now use Supabase adapters
import { EconomyManager } from "../client/src/lib/economy";
import { ChallengeService } from "./challengeService";
import { SeasonService } from "./seasonService";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import Stripe from "stripe";
import { randomBytes, createHash } from "crypto";
import { supabase } from "./supabase.js";
import { ProfileAdapter, StatsAdapter, FriendsAdapter, InventoryAdapter, GemsAdapter } from "./adapters";
import {
  Client,
  Environment,
  LogLevel,
  OAuthAuthorizationController,
  OrdersController,
} from "@paypal/paypal-server-sdk";

const MemStore = MemoryStore(session);

// Generate unique 6-character referral code
function generateReferralCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// Generate unique referral code with collision check
async function generateUniqueReferralCode(): Promise<string> {
  let code = generateReferralCode();
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('referral_code', code)
      .limit(1);
    if (!existing || existing.length === 0) {
      return code;
    }
    code = generateReferralCode();
    attempts++;
  }
  
  throw new Error('Failed to generate unique referral code');
}

// PayPal configuration
const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.warn("PayPal credentials not configured - PayPal payments will be disabled");
}

const paypalClient = PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET ? new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: PAYPAL_CLIENT_ID,
    oAuthClientSecret: PAYPAL_CLIENT_SECRET,
  },
  timeout: 0,
  environment: process.env.NODE_ENV === "production" ? Environment.Production : Environment.Sandbox,
  logging: {
    logLevel: LogLevel.Info,
    logRequest: { logBody: true },
    logResponse: { logHeaders: true },
  },
}) : null;

const ordersController = paypalClient ? new OrdersController(paypalClient) : null;
const oAuthController = paypalClient ? new OAuthAuthorizationController(paypalClient) : null;

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
    case 'tickets':
      updates.tickets = (user.tickets || 0) + reward.amount!;
      console.log(`🎟️ User ${user.username} won ${reward.amount} tickets! Total: ${updates.tickets}`);
      break;
    case 'xp':
      const newXp = (user.xp || 0) + reward.amount!;
      updates.xp = newXp;
      updates.level = EconomyManager.calculateLevel(newXp);
      break;
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

  // Atomic update of all user properties (coins, gems, tickets, xp, level)
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
  
  // Debug logging for CSRF validation (development only)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔍 CSRF Debug - Method: ${req.method}, URL: ${req.url}`);
    console.log(`🔍 Session Token: ${sessionToken ? sessionToken.substring(0, 8) + '...' : 'MISSING'}`);
    console.log(`🔍 Request Token: ${requestToken ? requestToken.substring(0, 8) + '...' : 'MISSING'}`);
  }
  
  if (!validateCSRFToken(sessionToken, requestToken)) {
    console.warn(`🚨 CSRF ATTACK BLOCKED: IP=${req.ip}, User=${req.session?.userId || 'anonymous'}`);
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`🚨 Token mismatch - Session: ${sessionToken || 'NONE'}, Request: ${requestToken || 'NONE'}`);
    }
    return res.status(403).json({ message: "CSRF token validation failed" });
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`✅ CSRF validation passed for ${req.method} ${req.url}`);
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // 🔒 SECURE Session configuration with enhanced CSRF protection
  app.use(session({
    store: new MemStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || 'blackjack-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // 🔒 HTTPS only in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict' // 🔒 Primary CSRF protection - strict same-site policy
    }
  }));

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
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🆕 Generated NEW CSRF token for session: ${csrfToken.substring(0, 8)}...`);
      }
      
      // Force session save for new token
      req.session.save((err: any) => {
        if (err) {
          console.error("❌ Failed to save session for new CSRF token:", err);
          return res.status(500).json({ message: "Session save failed" });
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`✅ New CSRF token saved to session`);
        }
        res.json({ csrfToken });
      });
    } else {
      // Return existing token from session - NO ROTATION
      if (process.env.NODE_ENV !== 'production') {
        console.log(`♻️  Reusing existing CSRF token: ${csrfToken.substring(0, 8)}...`);
      }
      res.json({ csrfToken });
    }
  });

  // Authentication middleware - now uses Supabase auth
  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      // Get authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Store user ID for downstream use
      req.userId = user.id;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Authentication required" });
    }
  };

  // Auth routes - DISABLED: Trigger handles user creation
  // app.post("/api/auth/register", async (req, res) => {
  //   Signup is handled by Supabase trigger on_auth_user_created
  // });

  // Apple Sign-In endpoint - trigger handles user creation
  app.post("/api/auth/apple-signin", async (req, res) => {
    try {
      const { supabaseUserId, email, username } = req.body;

      if (!supabaseUserId || !email) {
        return res.status(400).json({ message: "Supabase user ID and email required" });
      }

      // Check if user exists (trigger should have created it)
      const existingUser = await storage.getUser(supabaseUserId);
      if (existingUser) {
        return res.json({ 
          user: {
            id: existingUser.id,
            email: existingUser.email,
            username: existingUser.username
          }
        });
      }

      // If not found, trigger may not have run yet - return basic info
      res.json({ 
        user: {
          id: supabaseUserId,
          email,
          username: username || email.split('@')[0]
        }
      });
    } catch (error: any) {
      console.error("Apple Sign-In error:", error);
      res.status(500).json({ message: error.message || "Apple login error" });
    }
  });

  // Get email from username (for login support)
  app.post("/api/auth/get-email", async (req, res) => {
    try {
      const { username } = req.body;
      console.log('🔍 get-email endpoint called with username:', username);
      
      if (!username) {
        return res.status(400).json({ message: "Username required" });
      }
      
      // Query public.profiles table in Supabase using supabase client
      console.log('📝 Querying profiles via Supabase client...');
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', username)
        .limit(1)
        .single();
      
      if (error || !data) {
        console.log('⚠️ No user found with username:', username, error);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log('✅ Found email:', data.email);
      res.json({ email: data.email });
    } catch (error: any) {
      console.error('❌ get-email error:', error);
      console.error('❌ error.message:', error.message);
      console.error('❌ error.stack:', error.stack);
      res.status(500).json({ message: error.message });
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

  // Reset password route (disabled - using Supabase auth)
  app.post("/api/auth/reset-password", async (req, res) => {
    return res.status(501).json({ message: "Password reset is handled through Supabase auth" });
  });

  // Change password route (disabled - using Supabase auth)
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    return res.status(501).json({ message: "Password changes are handled through Supabase auth" });
  });

  // Change username route
  app.post("/api/auth/change-username", requireAuth, async (req, res) => {
    try {
      const { newUsername } = req.body;
      const userId = (req as any).userId;

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

      res.json({ 
        message: "Username changed successfully",
        user: updatedUser
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to change username" });
    }
  });

  // User routes
  app.get("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      console.log(`🔍 GET /api/user/profile for user_id: ${userId}`);
      
      // Query public.profiles table in Supabase using supabase client
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, username, email, coins, gems, tickets')
        .eq('user_id', userId)
        .limit(1)
        .single();
      
      if (profile && !profileError) {
        console.log(`✅ Found user profile: ${profile.username}, coins: ${profile.coins}`);
        return res.json(profile);
      }
      
      // No profile found - get auth email and return defaults
      console.log(`⚠️  No profile found, returning defaults`);
      let authEmail = null;
      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
        authEmail = authUser?.email || null;
      } catch (err) {
        console.error('Failed to fetch auth email:', err);
      }
      
      return res.json({
        user_id: userId,
        username: null,
        email: authEmail,
        coins: 5000,
        gems: 0,
        tickets: 3
      });
    } catch (error: any) {
      console.error('❌ Error in GET /api/user/profile:', error);
      // Return 200 with defaults instead of 500
      let authEmail = null;
      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById((req as any).userId);
        authEmail = authUser?.email || null;
      } catch (err) {
        console.error('Failed to fetch auth email:', err);
      }
      
      return res.json({
        user_id: (req as any).userId,
        username: null,
        email: authEmail,
        coins: 5000,
        gems: 0,
        tickets: 3
      });
    }
  });

  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    const dump = (e: any) => ({
      message: e?.message ?? null,
      code: e?.code ?? null,
      details: e?.details ?? null,
      hint: e?.hint ?? null,
      status: e?.status ?? null,
      name: e?.name ?? null,
      stack: process.env.NODE_ENV !== 'production' ? e?.stack : undefined,
    });

    try {
      // Get authenticated user from Supabase
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('[API ERROR] PATCH /api/user/profile - Auth failed:', dump(authError));
        return res.status(401).json({ error: dump(authError) });
      }

      const userId = user.id;
      
      // Log Supabase config (first 6 chars of key only)
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      console.log(`[API] PATCH /api/user/profile uid=${userId}`);
      console.log(`  Supabase URL: ${supabaseUrl}`);
      console.log(`  Supabase Key (first 6): ${supabaseKey.substring(0, 6)}...`);
      console.log(`  Payload received:`, req.body);
      
      // Allowlist of modifiable fields (no coins/gems/tickets allowed here)
      // Map camelCase (frontend) to snake_case (Supabase DB)
      const ALLOWED_FIELDS_MAP: Record<string, string> = {
        'selectedAvatarId': 'selected_avatar_id',
        'selectedCardBackId': 'selected_card_back_id',
        'username': 'username'
      };
      
      // Filter request body to only allowed fields and convert to snake_case
      const allowedUpdates: Record<string, any> = {};
      for (const [camelField, snakeField] of Object.entries(ALLOWED_FIELDS_MAP)) {
        if (req.body[camelField] !== undefined) {
          allowedUpdates[snakeField] = req.body[camelField];
        }
      }
      
      // Check if there are any valid updates
      if (Object.keys(allowedUpdates).length === 0) {
        console.log(`[API] PATCH /api/user/profile - No valid fields to update`);
        return res.status(400).json({ 
          error: { 
            message: "Use /api/user/coins/update for balance changes. This endpoint only accepts: username, selectedAvatarId, selectedCardBackId" 
          } 
        });
      }
      
      console.log(`  Table: public.profiles`);
      console.log(`  Operation: UPDATE SET`, allowedUpdates);
      console.log(`  WHERE user_id = '${userId}'`);
      
      // Update profile in Supabase
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(allowedUpdates)
        .eq('user_id', userId)
        .select('*')
        .single();
      
      if (updateError) {
        console.error('[API ERROR] PATCH /api/user/profile', dump(updateError));
        return res.status(400).json({ error: dump(updateError) });
      }
      
      if (!updatedProfile) {
        const notFoundError = { message: "Profile not found", code: 'PGRST116' };
        console.error('[API ERROR] PATCH /api/user/profile', dump(notFoundError));
        return res.status(404).json({ error: dump(notFoundError) });
      }
      
      console.log(`[API SUCCESS] PATCH /api/user/profile - Profile updated for user ${userId}`);
      
      // Return updated profile for UI refresh
      res.json(updatedProfile);
    } catch (error: any) {
      console.error('[API ERROR] PATCH /api/user/profile - Unexpected error:', dump(error));
      res.status(500).json({ error: dump(error) });
    }
  });

  // Diagnostic endpoint
  app.get("/api/diag/profiles/me", requireAuth, async (req, res) => {
    const dump = (e: any) => ({
      message: e?.message ?? null,
      code: e?.code ?? null,
      details: e?.details ?? null,
      hint: e?.hint ?? null,
      status: e?.status ?? null,
      name: e?.name ?? null,
      stack: process.env.NODE_ENV !== 'production' ? e?.stack : undefined,
    });

    try {
      const userId = (req as any).userId;
      
      console.log(`[API] GET /api/diag/profiles/me uid=${userId}`);
      console.log(`  Table: public.profiles`);
      console.log(`  Operation: SELECT user_id, username, email, coins, gems, tickets WHERE user_id = '${userId}'`);
      
      const { data: row, error } = await supabase
        .from('profiles')
        .select('user_id, username, email, coins, gems, tickets')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('[API ERROR] GET /api/diag/profiles/me', dump(error));
        return res.status(404).json({ ok: false, error: dump(error) });
      }
      
      console.log(`[API SUCCESS] GET /api/diag/profiles/me - Found profile:`, row);
      res.json({ ok: true, row });
    } catch (err: any) {
      console.error('[API ERROR] GET /api/diag/profiles/me - Unexpected error:', dump(err));
      res.status(500).json({ ok: false, error: dump(err) });
    }
  });

  // Coins endpoints
  app.get("/api/user/coins", requireAuth, async (req, res) => {
    try {
      const profile = await ProfileAdapter.getProfile((req as any).userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.json({ coins: profile.coins || 0 });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/user/coins/update", requireAuth, async (req, res) => {
    const dump = (e: any) => ({
      message: e?.message ?? null,
      code: e?.code ?? null,
      details: e?.details ?? null,
      hint: e?.hint ?? null,
      status: e?.status ?? null,
      name: e?.name ?? null,
      stack: process.env.NODE_ENV !== 'production' ? e?.stack : undefined,
    });
    
    try {
      const userId = (req as any).userId;
      
      // Log Supabase config (first 6 chars of key only)
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      console.log(`[API] POST /api/user/coins/update uid=${userId}`);
      console.log(`  Supabase URL: ${supabaseUrl}`);
      console.log(`  Supabase Key (first 6): ${supabaseKey.substring(0, 6)}...`);
      console.log(`  Payload received:`, req.body);
      
      const { delta } = req.body;
      
      // Validate delta is a finite number between -1M and +1M
      if (typeof delta !== "number" || !Number.isFinite(delta) || delta < -1_000_000 || delta > 1_000_000) {
        const validationError = { message: "Delta must be a finite number between -1,000,000 and +1,000,000" };
        console.error('[API ERROR] POST /api/user/coins/update - Validation failed:', validationError);
        return res.status(400).json({ error: validationError });
      }
      
      console.log(`  Table: public.profiles`);
      console.log(`  Operation: SELECT coins WHERE user_id = '${userId}'`);
      
      // Read current coins from Supabase profiles
      const { data: profile, error: readError } = await supabase
        .from('profiles')
        .select('coins')
        .eq('user_id', userId)
        .single();
      
      if (readError) {
        console.error('[API ERROR] POST /api/user/coins/update - Read failed:', dump(readError));
        throw readError;
      }
      if (!profile) {
        const noProfileError = new Error('No profile row for user_id');
        console.error('[API ERROR] POST /api/user/coins/update - No profile:', dump(noProfileError));
        throw noProfileError;
      }
      
      const currentCoins = profile.coins || 0;
      const newCoins = currentCoins + delta;
      console.log(`  Current coins: ${currentCoins}, Delta: ${delta}, New coins: ${newCoins}`);
      console.log(`  Operation: UPDATE SET coins = ${newCoins} WHERE user_id = '${userId}'`);
      
      // Update coins atomically (coins = coins + delta)
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ coins: newCoins })
        .eq('user_id', userId)
        .select('coins')
        .single();
      
      if (updateError) {
        console.error('[API ERROR] POST /api/user/coins/update - Update failed:', dump(updateError));
        throw updateError;
      }
      if (!updatedProfile) {
        const noUpdateError = new Error('Update returned 0 rows');
        console.error('[API ERROR] POST /api/user/coins/update - No update:', dump(noUpdateError));
        throw noUpdateError;
      }
      
      console.log(`[API SUCCESS] POST /api/user/coins/update - Coins updated to ${updatedProfile.coins}`);
      res.json({ coins: updatedProfile.coins });
    } catch (err: any) {
      console.error('[API ERROR] POST /api/user/coins/update', dump(err));
      return res.status(400).json({ error: dump(err) });
    }
  });

  // Gems endpoints
  app.get("/api/user/gems", requireAuth, async (req, res) => {
    try {
      const profile = await ProfileAdapter.getProfile((req as any).userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.json({ gems: profile.gems || 0 });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/user/gems/add", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { amount, description, relatedId } = req.body;
      
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" });
      }
      
      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }
      
      // Update gems and create transaction
      const newGems = await ProfileAdapter.updateGems(userId, amount);
      await GemsAdapter.createGemTransaction(userId, amount, 'earn', description, relatedId);
      
      res.json({ gems: newGems });
    } catch (error: any) {
      console.error("Error adding gems:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/user/gems/spend", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { amount, description, relatedId } = req.body;
      
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" });
      }
      
      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }
      
      // Check balance first
      const profile = await ProfileAdapter.getProfile(userId);
      if (!profile || (profile.gems || 0) < amount) {
        return res.status(400).json({ message: "Insufficient gems" });
      }
      
      // Update gems and create transaction
      const newGems = await ProfileAdapter.updateGems(userId, -amount);
      await GemsAdapter.createGemTransaction(userId, amount, 'spend', description, relatedId);
      
      res.json({ gems: newGems });
    } catch (error: any) {
      console.error("Error spending gems:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // All-in ticket consumption endpoint
  app.post("/api/allin/consume-ticket", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await ProfileAdapter.getProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      if ((profile.tickets || 0) < 1) {
        return res.status(400).json({ message: "No tickets available" });
      }
      
      // Consume one ticket
      const ticketsRemaining = await ProfileAdapter.updateTickets(userId, -1);
      
      res.json({ 
        success: true, 
        ticketsRemaining 
      });
    } catch (error: any) {
      console.error("Error consuming ticket:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/gems/transactions", requireAuth, async (req, res) => {
    try {
      const transactions = await GemsAdapter.getUserGemTransactions((req as any).userId);
      res.json(transactions);
    } catch (error: any) {
      console.error("Error getting gem transactions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/gems/purchases", requireAuth, async (req, res) => {
    try {
      const purchases = await GemsAdapter.getUserGemPurchases((req as any).userId);
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
      
      const userId = (req as any).userId;
      
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
      const userId = (req as any).userId;
      const claimedRewards = await storage.getUserClaimedRankRewards(userId);
      res.json(claimedRewards);
    } catch (error: any) {
      console.error("Error getting claimed rank rewards:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ranks/claim-reward", requireAuth, async (req, res) => {
    try {
      const { rankKey, gemsAwarded } = req.body;
      const userId = (req as any).userId;

      if (!rankKey || typeof gemsAwarded !== "number" || gemsAwarded <= 0) {
        return res.status(400).json({ message: "Invalid reward data" });
      }

      // Check if already claimed
      const alreadyClaimed = await storage.hasUserClaimedRankReward(userId, rankKey);
      if (alreadyClaimed) {
        return res.status(400).json({ message: "Reward already claimed" });
      }

      // Claim the reward
      const claim = await storage.claimRankReward(userId, rankKey, gemsAwarded);
      
      // Get updated user data
      const user = await storage.getUser(userId);
      
      res.json({ 
        success: true,
        claim,
        totalGems: user?.gems || 0
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
      
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const AVATAR_COST = 10;
      
      // Check if user has enough gems
      if ((user.gems || 0) < AVATAR_COST) {
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
      
      // Create purchase record
      const purchase = await storage.createGemPurchase({
        userId,
        itemType: 'avatar',
        itemId: avatarId,
        gemCost: AVATAR_COST,
      });
      
      // Spend gems and create transaction record
      const updatedUser = await storage.spendGemsFromUser(userId, AVATAR_COST, `Avatar purchase: ${avatarId}`, purchase.id);
      
      res.json({ 
        success: true,
        avatarId,
        remainingGems: updatedUser.gems,
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
      const userId = (req as any).userId;
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

  // Server-side gem offers catalog
  const GEM_OFFERS = {
    'coins-5k': { type: 'coins', amount: 5000, gemCost: 50 },
    'coins-15k': { type: 'coins', amount: 15000, gemCost: 100 },
    'tickets-3': { type: 'tickets', amount: 3, gemCost: 30 },
    'tickets-10': { type: 'tickets', amount: 10, gemCost: 50 },
  };

  // Gem shop purchases (buy coins/tickets with gems)
  app.post("/api/shop/gem-purchase", requireAuth, requireCSRF, async (req, res) => {
    try {
      // Validate request body with strict schema
      const validOfferIds = ['coins-5k', 'coins-15k', 'tickets-3', 'tickets-10'] as const;
      const { offerId } = req.body;
      
      if (!offerId || typeof offerId !== 'string' || !validOfferIds.includes(offerId as any)) {
        return res.status(400).json({ error: "Invalid offer ID" });
      }
      
      const offer = GEM_OFFERS[offerId as keyof typeof GEM_OFFERS];
      if (!offer) {
        return res.status(400).json({ error: "Invalid offer" });
      }
      
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if user has enough gems
      if ((user.gems || 0) < offer.gemCost) {
        return res.status(400).json({ error: "Insufficient gems" });
      }
      
      // True atomic update: single operation to prevent race conditions
      const updates: any = {
        gems: (user.gems || 0) - offer.gemCost
      };
      
      if (offer.type === 'coins') {
        updates.coins = (user.coins || 0) + offer.amount;
      } else if (offer.type === 'tickets') {
        updates.tickets = (user.tickets || 0) + offer.amount;
      }
      
      // Single atomic update to prevent concurrent modification issues
      await storage.updateUser(userId, updates);
      
      res.json({ 
        success: true,
        message: `Successfully purchased ${offer.amount} ${offer.type} for ${offer.gemCost} gems`
      });
    } catch (error: any) {
      console.error("Error purchasing with gems:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Betting endpoints
  app.post("/api/bets/prepare", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { stake, gameType } = req.body;
      
      // Validate stake
      if (typeof stake !== 'number' || !Number.isFinite(stake) || stake <= 0) {
        return res.status(400).json({ error: { message: 'Stake must be a positive finite number', code: null, details: null } });
      }
      
      // Validate gameType against allowlist
      const validGameTypes = ['classic', 'high-stakes'];
      if (gameType && !validGameTypes.includes(gameType)) {
        return res.status(400).json({ error: { message: 'Invalid game type', code: 'INVALID_GAME_TYPE', details: null } });
      }
      
      // Read current coins from Supabase
      const { data: profile, error: readError } = await supabase
        .from('profiles')
        .select('coins')
        .eq('user_id', userId)
        .single();
      
      if (readError) {
        console.error('[API ERROR] /api/bets/prepare read', readError);
        return res.status(400).json({ error: { message: readError.message, code: readError.code ?? null, details: readError.details ?? null } });
      }
      
      if (!profile) {
        return res.status(404).json({ error: { message: 'User not found', code: null, details: null } });
      }
      
      const currentCoins = profile.coins || 0;
      
      // Check sufficient funds
      if (currentCoins < stake) {
        return res.status(400).json({ error: { message: 'INSUFFICIENT_FUNDS', code: 'INSUFFICIENT_FUNDS', details: null } });
      }
      
      // Debit immediately
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ coins: currentCoins - stake })
        .eq('user_id', userId)
        .select('coins')
        .single();
      
      if (updateError) {
        console.error('[API ERROR] /api/bets/prepare debit', updateError);
        return res.status(400).json({ error: { message: updateError.message, code: updateError.code ?? null, details: updateError.details ?? null } });
      }
      
      if (!updated) {
        return res.status(400).json({ error: { message: 'Failed to debit coins', code: null, details: null } });
      }
      
      // Generate unique game ID
      const gameId = crypto.randomUUID();
      
      // Info-level logging for audit trail
      const table = gameType || 'classic';
      console.log(`[BET] Prepared - userId: ${userId}, gameId: ${gameId}, stake: ${stake}, table: ${table}`);
      
      res.json({ 
        ok: true, 
        gameId: gameId,
        table: table,
        bet: stake
      });
    } catch (err: any) {
      console.error('[API ERROR] /api/bets/prepare', err);
      return res.status(400).json({ error: { message: err.message || 'Unknown error', code: err.code ?? null, details: null } });
    }
  });

  app.post("/api/bets/confirm", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      console.log('[API]', req.method, req.path, 'uid=', userId);
      
      const { result, stake, payout, gameType } = req.body;
      
      // Validate result
      if (!result || !['win', 'loss', 'push'].includes(result)) {
        return res.status(400).json({ error: { message: 'Result must be win, loss, or push', code: null } });
      }
      
      // Compute delta based on result
      let delta = 0;
      if (result === 'win') {
        delta = payout ?? stake; // net gain to add
      } else if (result === 'loss') {
        delta = 0; // already debited in prepare
      } else if (result === 'push') {
        delta = stake; // refund stake
      }
      
      // Update coins atomically
      const { data: profile, error: readError } = await supabase
        .from('profiles')
        .select('coins')
        .eq('user_id', userId)
        .single();
      
      if (readError) {
        console.error('[API ERROR] /api/bets/confirm read', readError);
        return res.status(400).json({ error: { message: readError.message, code: readError.code ?? null } });
      }
      
      if (!profile) {
        return res.status(404).json({ error: { message: 'User not found', code: null } });
      }
      
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ coins: (profile.coins || 0) + delta })
        .eq('user_id', userId)
        .select('coins')
        .single();
      
      if (updateError) {
        console.error('[API ERROR] /api/bets/confirm update', updateError);
        return res.status(400).json({ error: { message: updateError.message, code: updateError.code ?? null } });
      }
      
      if (!updated) {
        return res.status(400).json({ error: { message: 'Failed to update coins', code: null } });
      }
      
      // Upsert stats
      const winsIncrement = result === 'win' ? 1 : 0;
      const lossesIncrement = result === 'loss' ? 1 : 0;
      
      const { data: insertedStats, error: insertError } = await supabase
        .from('game_stats')
        .insert({
          user_id: userId,
          total_games: 1,
          wins: winsIncrement,
          losses: lossesIncrement,
          coins_earned: delta
        })
        .select()
        .single();
      
      if (insertError) {
        if (insertError.code === '23505') {
          // Conflict - do update
          const { data: currentStats, error: selectError } = await supabase
            .from('game_stats')
            .select('total_games, wins, losses, coins_earned')
            .eq('user_id', userId)
            .single();
          
          if (selectError) {
            console.error('[API ERROR] /api/bets/confirm stats select', selectError);
            return res.status(400).json({ error: { message: selectError.message, code: selectError.code ?? null } });
          }
          
          if (!currentStats) {
            return res.status(400).json({ error: { message: 'Stats not found for update', code: null } });
          }
          
          const { error: updateStatsError } = await supabase
            .from('game_stats')
            .update({
              total_games: (currentStats.total_games || 0) + 1,
              wins: (currentStats.wins || 0) + winsIncrement,
              losses: (currentStats.losses || 0) + lossesIncrement,
              coins_earned: (currentStats.coins_earned || 0) + delta
            })
            .eq('user_id', userId);
          
          if (updateStatsError) {
            console.error('[API ERROR] /api/bets/confirm stats update', updateStatsError);
            return res.status(400).json({ error: { message: updateStatsError.message, code: updateStatsError.code ?? null } });
          }
        } else {
          console.error('[API ERROR] /api/bets/confirm stats insert', insertError);
          return res.status(400).json({ error: { message: insertError.message, code: insertError.code ?? null } });
        }
      }
      
      res.json({ coins: updated.coins });
    } catch (err: any) {
      console.error('[API ERROR] /api/bets/confirm', err);
      return res.status(400).json({ error: { message: err.message || 'Unknown error', code: err.code ?? null } });
    }
  });

  app.post("/api/bets/cancel", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
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

  // Game stats routes
  app.post("/api/stats", requireAuth, async (req, res) => {
    const safe = (e: any) => ({
      message: e?.message || 'unknown',
      details: e?.details || e?.hint || null,
      code: e?.code || null,
      stack: process.env.NODE_ENV !== 'production' ? e?.stack : undefined,
    });
    
    try {
      const userId = (req as any).userId;
      console.log('[API]', req.method, req.path, 'uid=', userId);
      
      const { gameType, result, amount } = req.body;
      
      // Validate input
      if (!gameType || typeof gameType !== 'string') {
        return res.status(400).json({ error: "gameType is required and must be a string" });
      }
      
      if (!result || !['win', 'loss', 'push'].includes(result)) {
        return res.status(400).json({ error: "result must be 'win', 'loss', or 'push'" });
      }
      
      if (typeof amount !== 'number' || !Number.isFinite(amount)) {
        return res.status(400).json({ error: "amount must be a finite number" });
      }
      
      // Calculate increments
      const winsIncrement = result === 'win' ? 1 : 0;
      const lossesIncrement = result === 'loss' ? 1 : 0;
      
      // Try to insert first, if conflict then update
      const { data: insertedStats, error: insertError } = await supabase
        .from('game_stats')
        .insert({
          user_id: userId,
          total_games: 1,
          wins: winsIncrement,
          losses: lossesIncrement,
          coins_earned: amount
        })
        .select()
        .single();
      
      if (insertError) {
        // If conflict (user_id already exists), do update
        if (insertError.code === '23505') {
          // First, get current stats
          const { data: currentStats, error: selectError } = await supabase
            .from('game_stats')
            .select('total_games, wins, losses, coins_earned')
            .eq('user_id', userId)
            .single();
          
          if (selectError) throw selectError;
          if (!currentStats) throw new Error('No stats row found for update');
          
          // Then update with increments
          const { error: updateError } = await supabase
            .from('game_stats')
            .update({
              total_games: (currentStats.total_games || 0) + 1,
              wins: (currentStats.wins || 0) + winsIncrement,
              losses: (currentStats.losses || 0) + lossesIncrement,
              coins_earned: (currentStats.coins_earned || 0) + amount
            })
            .eq('user_id', userId);
          
          if (updateError) throw updateError;
        } else {
          throw insertError;
        }
      }
      
      res.json({ ok: true });
    } catch (err: any) {
      console.error('[API ERROR] POST /api/stats', safe(err));
      return res.status(400).json({ error: safe(err) });
    }
  });

  app.get("/api/stats/summary", requireAuth, async (req, res) => {
    try {
      const stats = await StatsAdapter.getStats((req as any).userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Leaderboard routes
  app.get("/api/leaderboard/weekly-streak", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const leaderboard = await storage.getWeeklyStreakLeaderboard(limit);
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Error fetching weekly streak leaderboard:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/leaderboard/premium-weekly-streak", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const leaderboard = await storage.getPremiumWeeklyStreakLeaderboard(limit);
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Error fetching premium weekly streak leaderboard:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/leaderboard/top50-streak", requireAuth, async (req, res) => {
    try {
      const leaderboard = await storage.getTop50StreakLeaderboard();
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Error fetching top 50 streak leaderboard:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leaderboard/update-weekly-streak", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const weekStart = storage.getCurrentWeekStart();
      const entry = await storage.updateWeeklyStreakEntry(
        userId,
        user.maxStreak21 || 0,
        weekStart,
        user.totalStreakWins || 0,
        user.totalStreakEarnings || 0
      );

      // Recalculate ranks for all entries
      await storage.calculateWeeklyRanks();

      res.json({ entry, message: "Weekly streak entry updated" });
    } catch (error: any) {
      console.error("Error updating weekly streak entry:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Daily spin routes
  app.get("/api/daily-spin/can-spin", requireAuth, async (req, res) => {
    try {
      const canSpin = await storage.canUserSpin((req as any).userId);
      res.json(canSpin);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/daily-spin", requireAuth, async (req, res) => {
    try {
      const canSpin = await storage.canUserSpin((req as any).userId);
      if (!canSpin) {
        return res.status(400).json({ message: "Already spun today" });
      }

      // Use wheel of fortune logic that includes tickets
      const reward = EconomyManager.generateWheelOfFortuneReward();
      
      // Record spin
      await storage.createDailySpin({
        userId: (req as any).userId,
        reward: reward,
      });

      // Apply reward to user atomically
      await applySpinReward((req as any).userId, reward, true);

      res.json({ reward });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Unified spin endpoints - canonical API
  app.get("/api/spin/status", requireAuth, async (req, res) => {
    try {
      const status = await storage.getSpinStatus((req as any).userId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/spin/perform", requireAuth, async (req, res) => {
    try {
      const canSpin = await storage.canUserSpin24h((req as any).userId);
      if (!canSpin) {
        return res.status(400).json({ message: "Already spun today" });
      }

      // Generate reward (using wheel of fortune logic for better rewards)
      const reward = EconomyManager.generateWheelOfFortuneReward();
      
      // Record spin using unified method
      await storage.createSpin((req as any).userId, reward);

      // Apply reward to user atomically
      await applySpinReward((req as any).userId, reward, false);

      res.json({ reward });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Wheel of Fortune routes
  app.get("/api/wheel-of-fortune/can-spin", requireAuth, async (req, res) => {
    try {
      const canSpin = await storage.canUserSpinWheel((req as any).userId);
      res.json({ canSpin });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/wheel-of-fortune/time-until-free-spin", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      
      // Get user's last spin from database using Supabase
      const { data: userSpin } = await supabase
        .from('daily_spins')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!userSpin || userSpin.length === 0 || !userSpin[0].created_at) {
        // User hasn't spun yet, can spin immediately
        return res.json({ canSpinNow: true, timeUntilNext: 0 });
      }

      const lastSpinDate = new Date(userSpin[0].created_at);
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
      await applySpinReward((req as any).userId, reward, false);

      res.json({ reward });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Premium wheel spin with gems
  app.post("/api/wheel-of-fortune/premium-spin", requireAuth, requireCSRF, async (req, res) => {
    try {
      const user = await storage.getUser((req as any).userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has enough gems
      if ((user.gems || 0) < 10) {
        return res.status(400).json({ message: "Not enough gems. You need 10 gems to spin." });
      }

      // Use reward from request body (calculated by frontend)
      const reward = {
        type: req.body.rewardType,
        amount: req.body.rewardAmount
      };
      
      // Deduct gems and apply reward
      const updates: any = {
        gems: (user.gems || 0) - 10  // Deduct 10 gems
      };
      
      switch (reward.type) {
        case 'coins':
          updates.coins = (user.coins || 0) + reward.amount!;
          break;
        case 'gems':
          updates.gems = updates.gems + reward.amount!; // Add reward gems to the already deducted amount
          break;
        case 'tickets':
          updates.tickets = (user.tickets || 0) + reward.amount!;
          break;
        case 'xp':
          const newXp = (user.xp || 0) + reward.amount!;
          updates.xp = newXp;
          updates.level = EconomyManager.calculateLevel(newXp);
          break;
      }

      await storage.updateUser((req as any).userId, updates);

      res.json({ reward });
    } catch (error: any) {
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
      const userId = (req as any).userId;
      
      // Ensure user exists in public.users before assigning challenges
      // The database trigger (on_auth_user_created) creates users automatically
      // We retry with backoff to handle read-after-write consistency delay
      let user = await storage.getUser(userId);
      
      if (!user) {
        console.log(`⚠️  User ${userId} not found, retrying with backoff (trigger may be processing)...`);
        // Retry up to 3 times with 250ms backoff for read-after-write consistency
        for (let attempt = 0; attempt < 3 && !user; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 250));
          user = await storage.getUser(userId);
          if (user) {
            console.log(`✅ User ${userId} found on retry attempt ${attempt + 1}`);
          }
        }
        
        if (!user) {
          // Still not found after retries - log warning and return empty challenges
          console.warn(`⚠️  User ${userId} not in public.users after retries. Trigger may have failed.`);
          return res.status(202).json({ 
            message: "Profile is being created, please try again shortly",
            challenges: []
          });
        }
      }
      
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
      const userId = (req as any).userId;
      const challengeId = req.params.challengeId;
      
      console.log(`🎯 CLAIM DEBUG: User ${userId} attempting to claim challenge ${challengeId}`);
      
      const result = await ChallengeService.claimChallengeReward(userId, challengeId);
      
      console.log(`🎯 CLAIM RESULT: success=${result.success}, error=${result.error}, reward=${result.reward || 'none'}`);
      
      if (result.success) {
        res.json({ 
          success: true, 
          reward: result.reward,
          message: `Successfully claimed ${result.reward} coins!` 
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
    try {
      const healthCheck = await storage.getCardBacksHealthCheck();
      
      if (healthCheck.isHealthy) {
        res.status(200).json({
          status: "healthy",
          cardBacks: {
            count: healthCheck.count,
            minRequired: healthCheck.minRequired,
            isHealthy: healthCheck.isHealthy
          },
          message: "System ready for operations"
        });
      } else {
        res.status(503).json({
          status: "unhealthy",
          cardBacks: {
            count: healthCheck.count,
            minRequired: healthCheck.minRequired,
            isHealthy: healthCheck.isHealthy
          },
          message: "System not ready - insufficient card backs"
        });
      }
    } catch (error: any) {
      console.error("Error in health check:", error);
      res.status(500).json({
        status: "error",
        message: "Health check failed",
        error: error.message
      });
    }
  });

  // Temporary endpoint to reset today's challenges (to force English templates) - skip auth
  app.post("/api/challenges/reset-today", (req, res, next) => {
    // Skip authentication for this temporary endpoint
    next();
  }, async (req, res) => {
    try {
      // Delete today's challenges from the database
      await storage.deleteTodaysChallenges();
      
      // Create new challenges with updated English templates
      const newChallenges = await ChallengeService.createDailyChallenges();
      
      // This is a temporary endpoint - no user assignment for now
      console.log("Created new English challenges:", newChallenges.length);
      
      res.json({ message: "Today's challenges have been reset with English templates", challenges: newChallenges });
    } catch (error: any) {
      console.error("Error resetting today's challenges:", error);
      res.status(500).json({ message: error.message });
    }
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

  app.post("/api/challenges/progress", requireAuth, async (req, res) => {
    try {
      const { challengeId, progress } = req.body;
      const userId = (req as any).userId;
      
      // Update progress
      await storage.updateChallengeProgress(userId, challengeId, progress);
      
      // Check if challenge is completed
      const userChallenge = await storage.getUserChallenges(userId);
      const challenge = userChallenge.find(uc => uc.challengeId === challengeId);
      
      if (challenge && progress >= challenge.challenge.targetValue && !challenge.isCompleted) {
        // Complete the challenge
        await storage.completeChallengeForUser(userId, challengeId);
        
        // Award coins
        const user = await storage.getUser(userId);
        if (user) {
          await storage.updateUserCoins(userId, (user.coins || 0) + challenge.challenge.reward);
        }
        
        res.json({ completed: true, reward: challenge.challenge.reward });
      } else {
        res.json({ completed: false });
      }
    } catch (error: any) {
      console.error("Error updating challenge progress:", error);
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
      const userId = (req as any).userId;
      
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
      const userId = (req as any).userId;
      
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
      const seasonId = "september-season-2024";
      
      const rewards = await storage.claimBattlePassTier(userId, seasonId, tier, isPremium);
      
      // Return updated user data with multi-reward format
      const updatedUser = await storage.getUser(userId);
      res.json({ 
        reward: rewards, // Contains coins, gems, and tickets
        user: updatedUser,
        message: `Successfully claimed ${isPremium ? 'premium' : 'free'} reward for tier ${tier}: ${rewards.coins} coins, ${rewards.gems} gems, ${rewards.tickets} tickets`
      });
    } catch (error: any) {
      console.error("Error claiming Battle Pass tier:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/battlepass/claimed-tiers", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      
      // Use a static season ID for now
      const seasonId = "september-season-2024";
      
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
      const userId = (req as any).userId;
      const { itemType, itemId, currency, price } = req.body;
      
      const profile = await ProfileAdapter.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Check if user can afford
      if (!EconomyManager.canAfford(profile.coins || 0, profile.gems || 0, price, currency)) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      // Deduct currency
      if (currency === 'coins') {
        await ProfileAdapter.updateCoins(userId, -price);
      } else {
        await ProfileAdapter.updateGems(userId, -price);
      }

      // Add item to inventory
      await InventoryAdapter.addInventoryItem(userId, itemType, itemId);

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Inventory routes
  app.get("/api/inventory", requireAuth, async (req, res) => {
    try {
      const inventory = await InventoryAdapter.getUserInventory((req as any).userId);
      res.json(inventory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Card back inventory route
  app.get("/api/inventory/card-backs", requireAuth, async (req, res) => {
    try {
      const inventory = await InventoryAdapter.getUserInventory((req as any).userId);
      const cardBacks = inventory.filter((item: any) => item.item_type === 'card_back');
      res.json(cardBacks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });



  // Achievement routes
  app.get("/api/achievements", requireAuth, async (req, res) => {
    try {
      const achievements = await storage.getUserAchievements((req as any).userId);
      res.json(achievements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", requireAuth, async (req, res) => {
    try {
      const { amount, packType, packId } = req.body;
      
      console.log('Creating payment intent:', { amount, packType, packId, userId: (req as any).userId });
      
      if (!process.env.STRIPE_SECRET_KEY) {
        console.error('Stripe secret key not configured');
        throw new Error('Stripe secret key not configured');
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-08-27.basil",
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        },
        metadata: {
          userId: (req as any).userId,
          packType, // 'coins' or 'gems'
          packId: packId.toString(),
        },
      });

      console.log('Payment intent created successfully:', paymentIntent.id);
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Stripe payment intent error:', error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // PaymentIntent endpoint pour Apple Pay et Google Pay (montant en cents)
  app.post("/api/create-payment-intent-wallet", requireAuth, async (req, res) => {
    try {
      const { amount, currency = "eur", metadata = {} } = req.body; // amount en cents
      
      console.log('Creating wallet payment intent:', { amount, currency, metadata, userId: (req as any).userId });
      
      if (!process.env.STRIPE_SECRET_KEY) {
        console.error('Stripe secret key not configured');
        throw new Error('Stripe secret key not configured');
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-08-27.basil",
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount, // Montant déjà en cents
        currency, // "eur" par défaut, ou "usd"
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId: (req as any).userId,
          ...metadata // métadonnées additionnelles (ex: { packId: "gems_100" })
        },
      });

      console.log('Wallet payment intent created successfully:', paymentIntent.id);
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Stripe wallet payment intent error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Stripe webhook to handle successful payments
  app.post("/api/stripe-webhook", async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe secret key not configured');
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-08-27.basil",
      });

      const event = req.body;

      // Handle the payment_intent.succeeded event
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { userId, packType, packId } = paymentIntent.metadata;

        // Define pack rewards
        const coinPacks = [
          { id: 1, coins: 5000 },
          { id: 2, coins: 30000 },
          { id: 3, coins: 100000 },
          { id: 4, coins: 1000000 },
        ];

        const gemPacks = [
          { id: 1, gems: 50 },
          { id: 2, gems: 300 },
          { id: 3, gems: 1000 },
          { id: 4, gems: 3000 },
        ];

        // Award the appropriate currency to the user
        const updates: any = {};
        const user = await storage.getUser(userId);
        
        if (!user) {
          console.error('User not found for payment:', userId);
          return res.status(404).json({ message: 'User not found' });
        }

        if (packType === 'coins') {
          const pack = coinPacks.find(p => p.id === parseInt(packId));
          if (pack) {
            updates.coins = (user.coins || 0) + pack.coins;
          }
        } else if (packType === 'gems') {
          const pack = gemPacks.find(p => p.id === parseInt(packId));
          if (pack) {
            updates.gems = (user.gems || 0) + pack.gems;
          }
        }

        if (Object.keys(updates).length > 0) {
          await storage.updateUser(userId, updates);
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Stripe webhook error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Premium subscription routes (Stripe)
  app.post("/api/subscription/create", requireAuth, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: "Stripe not configured" });
      }
      
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-08-27.basil",
      });

      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Prix de l'abonnement premium : 4.99€/mois
      const priceAmount = 499; // 4.99€ en centimes

      // Créer ou récupérer le client Stripe
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id }
        });
        customerId = customer.id;
        await storage.updateUser(userId, { stripeCustomerId: customerId });
      }

      // Créer la session de checkout pour l'abonnement
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Abonnement Premium Blackjack',
              description: 'Accès aux récompenses premium du Battle Pass',
            },
            unit_amount: priceAmount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${req.headers.origin}/battlepass?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/shop`,
        metadata: {
          userId: user.id,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Erreur création abonnement:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/subscription/status", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
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
            subscriptionExpiresAt: null
          });
        }
      }

      res.json({ 
        membershipType: isActive ? 'premium' : 'normal',
        isActive,
        expiresAt
      });
    } catch (error: any) {
      console.error('Erreur vérification statut:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/subscription/cancel", requireAuth, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: "Stripe not configured" });
      }
      
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-08-27.basil",
      });

      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      // Annuler l'abonnement Stripe
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      res.json({ message: "Subscription will be cancelled at the end of the billing period" });
    } catch (error: any) {
      console.error('Erreur annulation abonnement:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook Stripe pour gérer les paiements d'abonnement
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: "Stripe not configured" });
      }
      
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-08-27.basil",
      });

      const sig = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret!);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Gérer les événements d'abonnement
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as any;
          if (session.mode === 'subscription') {
            const userId = session.metadata.userId;
            if (userId) {
              // Activer l'abonnement premium
              const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours
              await storage.updateUser(userId, {
                membershipType: 'premium',
                subscriptionExpiresAt: expiresAt,
                stripeSubscriptionId: session.subscription
              });
            }
          }
          break;

        case 'invoice.payment_succeeded':
          const invoice = event.data.object as any;
          if (invoice.subscription) {
            // Renouveler l'abonnement
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const customerId = subscription.customer as string;
            const customer = await stripe.customers.retrieve(customerId);
            
            if (customer && 'metadata' in customer && customer.metadata.userId) {
              const userId = customer.metadata.userId;
              const expiresAt = new Date((subscription as any).current_period_end * 1000);
              await storage.updateUser(userId, {
                membershipType: 'premium',
                subscriptionExpiresAt: expiresAt
              });
            }
          }
          break;

        case 'invoice.payment_failed':
        case 'customer.subscription.deleted':
          const failedSubscription = event.data.object as any;
          if (failedSubscription.customer) {
            const customer = await stripe.customers.retrieve(failedSubscription.customer);
            if (customer && 'metadata' in customer && customer.metadata.userId) {
              const userId = customer.metadata.userId;
              await storage.updateUser(userId, {
                membershipType: 'normal',
                subscriptionExpiresAt: null,
                stripeSubscriptionId: null
              });
            }
          }
          break;
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Erreur webhook Stripe:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // PayPal routes
  app.get("/api/paypal/setup", async (req, res) => {
    try {
      if (!oAuthController || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        return res.status(500).json({ error: "PayPal not configured" });
      }

      const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
      const { result } = await oAuthController.requestToken(
        { authorization: `Basic ${auth}` },
        { intent: "sdk_init", response_type: "client_token" }
      );

      res.json({ clientToken: result.accessToken });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get PayPal client token" });
    }
  });

  app.post("/api/paypal/order", requireAuth, async (req, res) => {
    try {
      if (!ordersController) {
        return res.status(500).json({ error: "PayPal not configured" });
      }

      const { amount, packType, packId } = req.body;

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const collect = {
        body: {
          intent: "CAPTURE" as any,
          purchaseUnits: [{
            amount: {
              currencyCode: "USD",
              value: amount.toString(),
            },
            customId: JSON.stringify({
              userId: (req as any).userId,
              packType,
              packId: packId.toString(),
            }),
          }],
        },
        prefer: "return=minimal",
      };

      const { body, ...httpResponse } = await ordersController.createOrder(collect);
      const jsonResponse = JSON.parse(String(body));
      res.status(httpResponse.statusCode).json(jsonResponse);
    } catch (error: any) {
      console.error("Failed to create PayPal order:", error);
      res.status(500).json({ error: "Failed to create PayPal order" });
    }
  });

  app.post("/api/paypal/order/:orderID/capture", requireAuth, async (req, res) => {
    try {
      if (!ordersController) {
        return res.status(500).json({ error: "PayPal not configured" });
      }

      const { orderID } = req.params;
      const collect = {
        id: orderID,
        prefer: "return=minimal",
      };

      const { body, ...httpResponse } = await ordersController.captureOrder(collect);
      const jsonResponse = JSON.parse(String(body));

      // Award currency to user if payment successful
      if (jsonResponse.status === 'COMPLETED') {
        const purchaseUnit = jsonResponse.purchase_units?.[0];
        if (purchaseUnit?.custom_id) {
          try {
            const { userId, packType, packId } = JSON.parse(purchaseUnit.custom_id);
            const user = await storage.getUser(userId);

            if (user) {
              const coinPacks = [
                { id: 1, coins: 5000 }, { id: 2, coins: 30000 },
                { id: 3, coins: 100000 }, { id: 4, coins: 1000000 },
              ];
              const gemPacks = [
                { id: 1, gems: 50 }, { id: 2, gems: 300 },
                { id: 3, gems: 1000 }, { id: 4, gems: 3000 },
              ];

              const updates: any = {};
              if (packType === 'coins') {
                const pack = coinPacks.find(p => p.id === parseInt(packId));
                if (pack) updates.coins = (user.coins || 0) + pack.coins;
              } else if (packType === 'gems') {
                const pack = gemPacks.find(p => p.id === parseInt(packId));
                if (pack) updates.gems = (user.gems || 0) + pack.gems;
              } else if (packType === 'premium') {
                // Handle premium subscription
                updates.isPremium = true;
                if (packId === 'annual') {
                  // Set expiry date to 1 year from now
                  updates.premiumExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
                } else if (packId === 'monthly') {
                  // Set expiry date to 1 month from now
                  updates.premiumExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                }
              }

              if (Object.keys(updates).length > 0) {
                await storage.updateUser(userId, updates);
              }
            }
          } catch (parseError) {
            console.error("Failed to parse PayPal custom_id:", parseError);
          }
        }
      }

      res.status(httpResponse.statusCode).json(jsonResponse);
    } catch (error: any) {
      console.error("Failed to capture PayPal order:", error);
      res.status(500).json({ error: "Failed to capture PayPal order" });
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
      const userId = (req as any).userId;
      
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

  app.post("/api/shop/buy-card-back", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const gemCost = 500;

      // REMOVE PRE-CHECK: Let buyRandomCardBack handle all validation atomically
      // This prevents race conditions between check and purchase

      // Buy random card back (includes atomic gem check and deduction)
      const result = await storage.buyRandomCardBack(userId);
      
      // Get updated gem balance from database after successful purchase
      const updatedUser = await storage.getUser(userId);
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user data');
      }
      
      res.json({ 
        success: true, 
        data: {
          cardBack: result.cardBack,
          duplicate: result.duplicate,
          gemsSpent: gemCost,
          remainingGems: updatedUser.gems || 0
        }
      });
    } catch (error: any) {
      console.error("Error buying card back:", error);
      
      // Handle all card backs owned case - SECURITY FIX: reject with 409
      if (error.message === 'All card backs owned') {
        return res.status(409).json({
          success: false,
          error: "You already own all available card backs. No purchase needed."
        });
      }
      
      // Handle standard errors with proper HTTP status codes
      if (error.message === 'Insufficient gems') {
        return res.status(400).json({ 
          success: false, 
          error: "You need 50 gems to buy a card back." 
        });
      }
      
      if (error.message === 'Card back already owned') {
        return res.status(409).json({ 
          success: false, 
          error: "This card back is already owned. Please try again." 
        });
      }
      
      res.status(500).json({ success: false, error: error.message || "Failed to buy card back" });
    }
  });

  // Mystery Card Back endpoint - Main gacha system (50 gems)
  // Buy a specific card back by ID  
  app.post("/api/shop/card-backs/:cardBackId/buy", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const cardBackId = req.params.cardBackId;

      if (!cardBackId) {
        return res.status(400).json({ 
          success: false, 
          error: "Card back ID is required" 
        });
      }

      // Buy specific card back
      const result = await storage.buySpecificCardBack(userId, cardBackId);
      
      // Get updated gem balance from database after successful purchase
      const updatedUser = await storage.getUser(userId);
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user data');
      }
      
      res.json({ 
        success: true, 
        data: {
          cardBack: result.cardBack,
          duplicate: result.duplicate,
          gemsSpent: result.cardBack.priceGems,
          remainingGems: updatedUser.gems || 0
        }
      });
    } catch (error: any) {
      console.error("Error in specific card back purchase:", error);
      
      // Handle card back not available
      if (error.message === 'Card back not available for purchase') {
        return res.status(404).json({
          success: false,
          error: "This card back is not available for purchase."
        });
      }
      
      // Handle insufficient gems
      if (error.message === 'Insufficient gems') {
        return res.status(400).json({ 
          success: false, 
          error: "You don't have enough gems to purchase this card back." 
        });
      }
      
      if (error.message === 'Card back already owned') {
        return res.status(409).json({ 
          success: false, 
          error: "You already own this card back." 
        });
      }
      
      res.status(500).json({ success: false, error: error.message || "Failed to purchase card back" });
    }
  });

  app.post("/api/shop/mystery-card-back", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const gemCost = 50;

      // Buy random card back with weighted probabilities
      // Common 60%, Rare 25%, Super Rare 10%, Legendary 5%
      const result = await storage.buyRandomCardBack(userId);
      
      // Get updated gem balance from database after successful purchase
      const updatedUser = await storage.getUser(userId);
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user data');
      }
      
      res.json({ 
        success: true, 
        data: {
          cardBack: result.cardBack,
          duplicate: result.duplicate,
          gemsSpent: gemCost,
          remainingGems: updatedUser.gems || 0
        }
      });
    } catch (error: any) {
      console.error("Error in mystery card back purchase:", error);
      
      // Handle all card backs owned case
      if (error.message === 'All card backs owned') {
        return res.status(409).json({
          success: false,
          error: "You already own all available card backs! Your collection is complete."
        });
      }
      
      // Handle insufficient gems
      if (error.message === 'Insufficient gems') {
        return res.status(400).json({ 
          success: false, 
          error: "You need 50 gems to purchase a mystery card back." 
        });
      }
      
      if (error.message === 'Card back already owned') {
        return res.status(409).json({ 
          success: false, 
          error: "This card back is already owned. Please try again." 
        });
      }
      
      res.status(500).json({ success: false, error: error.message || "Failed to purchase mystery card back" });
    }
  });

  app.patch("/api/user/selected-card-back", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      
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
      const userId = (req as any).userId;
      
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
      const userId = (req as any).userId;
      const { q: query } = req.query;

      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }

      const profiles = await ProfileAdapter.searchProfiles(query.trim(), userId);
      res.json({ users: profiles });
    } catch (error: any) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/friends/request", requireAuth, requireCSRF, async (req, res) => {
    try {
      const requesterId = (req as any).userId;
      const { recipientId } = req.body;

      if (!recipientId) {
        return res.status(400).json({ message: "Recipient ID is required" });
      }

      if (requesterId === recipientId) {
        return res.status(400).json({ message: "Cannot send friend request to yourself" });
      }

      const friendship = await FriendsAdapter.sendFriendRequest(requesterId, recipientId);
      res.json({ success: true, friendship });
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
      const recipientId = (req as any).userId;
      const { requesterId } = req.body;

      if (!requesterId) {
        return res.status(400).json({ message: "Requester ID is required" });
      }

      const friendship = await FriendsAdapter.acceptFriendRequest(requesterId, recipientId);
      res.json({ success: true, friendship });
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
      const recipientId = (req as any).userId;
      const { requesterId } = req.body;

      if (!requesterId) {
        return res.status(400).json({ message: "Requester ID is required" });
      }

      await FriendsAdapter.rejectFriendRequest(requesterId, recipientId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error rejecting friend request:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/friends/remove", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { friendId } = req.body;

      if (!friendId) {
        return res.status(400).json({ message: "Friend ID is required" });
      }

      await FriendsAdapter.removeFriend(userId, friendId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing friend:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const friends = await FriendsAdapter.getFriends(userId);
      res.json({ friends });
    } catch (error: any) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends/requests", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const requests = await FriendsAdapter.getFriendRequests(userId);
      res.json({ requests });
    } catch (error: any) {
      console.error("Error fetching friend requests:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends/check", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { friendId } = req.query;

      if (!friendId || typeof friendId !== 'string') {
        return res.status(400).json({ message: "Friend ID is required" });
      }

      const { status } = await FriendsAdapter.checkFriendship(userId, friendId);
      res.json({ areFriends: status === 'accepted' });
    } catch (error: any) {
      console.error("Error checking friendship:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Referral system endpoints
  app.get("/api/referral/my-code", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user || !user.referralCode) {
        return res.status(404).json({ message: "Referral code not found" });
      }

      res.json({ code: user.referralCode });
    } catch (error: any) {
      console.error("Error fetching referral code:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/referral/use-code", requireAuth, requireCSRF, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { code } = req.body;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Referral code is required" });
      }

      const result = await storage.useReferralCode(userId, code.toUpperCase());
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, reward: result.reward });
    } catch (error: any) {
      console.error("Error using referral code:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/referral/stats", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const stats = await storage.getReferralStats(userId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
