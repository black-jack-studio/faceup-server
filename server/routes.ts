import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertGameStatsSchema, insertInventorySchema, insertDailySpinSchema, insertBattlePassRewardSchema, dailySpins, claimBattlePassTierSchema, selectCardBackSchema, insertBetDraftSchema, betPrepareSchema, betCommitSchema, users, betDrafts } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte } from "drizzle-orm";
import { EconomyManager } from "../client/src/lib/economy";
import { ChallengeService } from "./challengeService";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import Stripe from "stripe";
import {
  Client,
  Environment,
  LogLevel,
  OAuthAuthorizationController,
  OrdersController,
} from "@paypal/paypal-server-sdk";

const MemStore = MemoryStore(session);

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    store: new MemStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || 'blackjack-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user with starting values
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
      });

      // Set session
      (req.session as any).userId = user.id;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Registration failed" });
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
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      (req.session as any).userId = user.id;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Login failed" });
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

  // Change password route
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req.session as any).userId;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await storage.updateUser(userId, { password: hashedNewPassword });

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

  // User routes
  app.get("/api/user/profile", requireAuth, async (req, res) => {
    try {
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
      
      res.json({ coins: user.coins || 0 });
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

  // Betting endpoints
  app.post("/api/bets/prepare", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      
      // Validate request body with Zod
      const { betId, amount, mode } = betPrepareSchema.parse(req.body);

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
      const tableMax = Math.min(userCoins, 1000000); // 1M table max

      if (amount < minBet || amount > tableMax) {
        return res.status(400).json({ message: `Bet must be between ${minBet} and ${tableMax}` });
      }

      // Premium mode validation for high-stakes
      if (mode === "high-stakes" && user.membershipType !== "premium") {
        return res.status(403).json({ message: "Premium membership required for High-Stakes mode" });
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
      const result = await db.transaction(async (tx) => {
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

        // Re-validate premium status for high-stakes mode
        if (betDraft.mode === "high-stakes" && user.membershipType !== "premium") {
          throw new Error("PREMIUM_REQUIRED_FOR_HIGH_STAKES");
        }

        // Re-validate bet limits dynamically
        const currentCoins = user.coins || 0;
        const minBet = 1;
        const tableMax = Math.min(currentCoins, 1000000);
        
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
          .where(and(eq(users.id, userId), gte(users.coins, betDraft.amount)))
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
        case "PREMIUM_REQUIRED_FOR_HIGH_STAKES":
          return res.status(403).json({ message: "Premium membership required for High-Stakes mode" });
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

  // Game stats routes
  app.post("/api/stats", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const statsData = insertGameStatsSchema.parse({
        ...req.body,
        userId,
      });

      const stats = await storage.createGameStats(statsData);
      
      // Mettre à jour la progression des challenges automatiquement
      const gameResult = {
        handsPlayed: statsData.handsPlayed || 0,
        handsWon: statsData.handsWon || 0,
        blackjacks: statsData.blackjacks || 0,
        coinsWon: (statsData.totalWinnings || 0) - (statsData.totalLosses || 0) // Gain net
      };
      
      const completedChallenges = await ChallengeService.updateChallengeProgress(userId, gameResult);
      
      // Système d'XP : +15 XP par victoire
      let xpResult;
      const xpGained = (statsData.handsWon || 0) * 15;
      if (xpGained > 0) {
        xpResult = await storage.addXPToUser(userId, xpGained);
      }
      
      // Mise à jour du streak pour le mode 21 Streak (high-stakes)
      let streakResult;
      if (statsData.gameType === "high-stakes" && (statsData.handsPlayed || 0) > 0) {
        const winsCount = (statsData.handsWon || 0) + (statsData.blackjacks || 0);
        const net = (statsData.totalWinnings || 0) - (statsData.totalLosses || 0);
        const isPush = winsCount === 0 && net === 0 && (statsData.handsPlayed || 0) > 0;
        const isLoss = winsCount === 0 && net < 0;
        
        if (winsCount > 0) {
          // Victoire(s) : incrémenter le streak par le nombre de victoires
          for (let i = 0; i < winsCount; i++) {
            streakResult = await storage.incrementStreak21(userId, (statsData.totalWinnings || 0) / winsCount);
          }
        } else if (isLoss) {
          // Défaite : réinitialiser le streak
          streakResult = await storage.resetStreak21(userId);
        }
        // Pour égalité (push), on ne change rien au streak
      }
      
      res.json({ 
        stats, 
        completedChallenges: completedChallenges.length > 0 ? completedChallenges : undefined,
        xpGained,
        levelUp: xpResult?.leveledUp ? {
          newLevel: xpResult.user.level,
          rewards: xpResult.rewards
        } : undefined,
        streakUpdate: streakResult
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

  app.post("/api/leaderboard/update-weekly-streak", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
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
      const canSpin = await storage.canUserSpin((req.session as any).userId);
      res.json(canSpin);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/daily-spin", requireAuth, async (req, res) => {
    try {
      const canSpin = await storage.canUserSpin((req.session as any).userId);
      if (!canSpin) {
        return res.status(400).json({ message: "Already spun today" });
      }

      const reward = EconomyManager.generateDailySpinReward();
      
      // Record spin
      await storage.createDailySpin({
        userId: (req.session as any).userId,
        reward: reward,
      });

      // Apply reward to user
      const user = await storage.getUser((req.session as any).userId);
      if (user) {
        const updates: any = {};
        
        switch (reward.type) {
          case 'coins':
            updates.coins = (user.coins || 0) + reward.amount!;
            break;
          case 'gems':
            updates.gems = (user.gems || 0) + reward.amount!;
            break;
          case 'xp':
            const newXp = (user.xp || 0) + reward.amount!;
            updates.xp = newXp;
            updates.level = EconomyManager.calculateLevel(newXp);
            break;
          case 'item':
            await storage.createInventory({
              userId: (req.session as any).userId,
              itemType: 'card_back',
              itemId: reward.itemId!,
            });
            break;
        }

        if (Object.keys(updates).length > 0) {
          await storage.updateUser((req.session as any).userId, updates);
        }
      }

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

      // Apply reward to user
      const user = await storage.getUser((req.session as any).userId);
      if (user) {
        const updates: any = {};
        
        switch (reward.type) {
          case 'coins':
            updates.coins = (user.coins || 0) + reward.amount!;
            break;
          case 'gems':
            updates.gems = (user.gems || 0) + reward.amount!;
            break;
          case 'xp':
            const newXp = (user.xp || 0) + reward.amount!;
            updates.xp = newXp;
            updates.level = EconomyManager.calculateLevel(newXp);
            break;
        }

        if (Object.keys(updates).length > 0) {
          await storage.updateUser((req.session as any).userId, updates);
        }
      }

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
      const canSpin = await storage.canUserSpinWheel((req.session as any).userId);
      if (!canSpin) {
        return res.status(400).json({ message: "Already spun today" });
      }

      const reward = EconomyManager.generateWheelOfFortuneReward();
      
      // Record spin
      await storage.createWheelSpin({
        userId: (req.session as any).userId,
        reward: reward,
      });

      // Apply reward to user
      const user = await storage.getUser((req.session as any).userId);
      if (user) {
        const updates: any = {};
        
        switch (reward.type) {
          case 'coins':
            updates.coins = (user.coins || 0) + reward.amount!;
            break;
          case 'gems':
            updates.gems = (user.gems || 0) + reward.amount!;
            break;
          case 'xp':
            const newXp = (user.xp || 0) + reward.amount!;
            updates.xp = newXp;
            updates.level = EconomyManager.calculateLevel(newXp);
            break;
        }

        if (Object.keys(updates).length > 0) {
          await storage.updateUser((req.session as any).userId, updates);
        }
      }

      res.json({ reward });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Premium wheel spin with gems
  app.post("/api/wheel-of-fortune/premium-spin", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has enough gems
      if ((user.gems || 0) < 10) {
        return res.status(400).json({ message: "Not enough gems. You need 10 gems to spin." });
      }

      const reward = EconomyManager.generateWheelOfFortuneReward();
      
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
        case 'xp':
          const newXp = (user.xp || 0) + reward.amount!;
          updates.xp = newXp;
          updates.level = EconomyManager.calculateLevel(newXp);
          break;
      }

      await storage.updateUser((req.session as any).userId, updates);

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
      const userId = (req.session as any).userId;
      
      // Get or create today's challenges
      const todaysChallenges = await ChallengeService.getTodaysChallenges();
      
      // Assign challenges to user if they don't have them already
      await ChallengeService.assignChallengesToUser(userId, todaysChallenges);
      
      // Retrieve user's challenges
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
      const userId = (req.session as any).userId;
      
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
      const timeRemaining = await storage.getTimeUntilSeasonEnd();
      res.json(timeRemaining);
    } catch (error: any) {
      console.error("Error getting time until season end:", error);
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
        // Strict validation of premium status
        const hasValidMembership = user.membershipType === 'premium';
        const hasValidSubscription = user.subscriptionExpiresAt && 
                                     new Date(user.subscriptionExpiresAt) > new Date();
        
        if (!hasValidMembership || !hasValidSubscription) {
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
      
      const reward = await storage.claimBattlePassTier(userId, seasonId, tier, isPremium);
      
      // Return updated user data
      const updatedUser = await storage.getUser(userId);
      res.json({ 
        reward,
        user: updatedUser,
        message: `Successfully claimed ${isPremium ? 'premium' : 'free'} reward for tier ${tier}`
      });
    } catch (error: any) {
      console.error("Error claiming Battle Pass tier:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/battlepass/claimed-tiers", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      
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

  // Card back inventory route
  app.get("/api/inventory/card-backs", requireAuth, async (req, res) => {
    try {
      const inventory = await storage.getUserInventory((req.session as any).userId);
      const cardBacks = inventory.filter((item: any) => item.itemType === 'card_back');
      res.json(cardBacks);
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

  // Stripe payment routes
  app.post("/api/create-payment-intent", requireAuth, async (req, res) => {
    try {
      const { amount, packType, packId } = req.body;
      
      console.log('Creating payment intent:', { amount, packType, packId, userId: (req.session as any).userId });
      
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
          userId: (req.session as any).userId,
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
      
      console.log('Creating wallet payment intent:', { amount, currency, metadata, userId: (req.session as any).userId });
      
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
          userId: (req.session as any).userId,
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

      const userId = (req.session as any).userId;
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

      const userId = (req.session as any).userId;
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
              userId: (req.session as any).userId,
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

  app.post("/api/shop/buy-card-back", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
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
  app.post("/api/shop/mystery-card-back", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
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

      // Get the selected card back details
      const selectedCardBackId = user.selectedCardBackId || "classic";
      const cardBack = await storage.getCardBack(selectedCardBackId);
      
      if (!cardBack) {
        return res.status(404).json({ success: false, error: "Selected card back not found" });
      }

      res.json({ 
        success: true, 
        data: { 
          selectedCardBackId,
          cardBack 
        } 
      });
    } catch (error: any) {
      console.error("Error fetching selected card back:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to fetch selected card back" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
