import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertGameStatsSchema, insertInventorySchema, insertDailySpinSchema } from "@shared/schema";
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
      
      res.json({ 
        stats, 
        completedChallenges: completedChallenges.length > 0 ? completedChallenges : undefined 
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
      
      // Obtenir ou créer les challenges du jour
      const todaysChallenges = await ChallengeService.getTodaysChallenges();
      
      // Assigner les challenges à l'utilisateur s'il ne les a pas déjà
      await ChallengeService.assignChallengesToUser(userId, todaysChallenges);
      
      // Récupérer les challenges de l'utilisateur
      const userChallenges = await storage.getUserChallenges(userId);
      res.json(userChallenges);
    } catch (error: any) {
      console.error("Error getting user challenges:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Route pour obtenir le temps restant jusqu'au prochain reset des défis
  app.get("/api/challenges/time-until-reset", async (req, res) => {
    try {
      const timeLeft = ChallengeService.getTimeUntilNextReset();
      res.json(timeLeft);
    } catch (error: any) {
      console.error("Error getting time until reset:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Route pour forcer la réinitialisation des défis (pour les tests/admin)
  app.post("/api/challenges/force-reset", async (req, res) => {
    try {
      // Nettoyer les anciens défis
      await ChallengeService.cleanupExpiredChallenges();
      
      // Créer de nouveaux défis 
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

  // Stripe payment routes
  app.post("/api/create-payment-intent", requireAuth, async (req, res) => {
    try {
      const { amount, packType, packId } = req.body;
      
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe secret key not configured');
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-06-20",
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        payment_method_types: ['card', 'apple_pay', 'google_pay'],
        metadata: {
          userId: (req.session as any).userId,
          packType, // 'coins' or 'gems'
          packId: packId.toString(),
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Stripe webhook to handle successful payments
  app.post("/api/stripe-webhook", async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe secret key not configured');
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-06-20",
      });

      const event = req.body;

      // Handle the payment_intent.succeeded event
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { userId, packType, packId } = paymentIntent.metadata;

        // Define pack rewards
        const coinPacks = [
          { id: 1, coins: 1000 },
          { id: 2, coins: 2500 },
          { id: 3, coins: 5000 },
          { id: 4, coins: 12000 },
        ];

        const gemPacks = [
          { id: 1, gems: 100 },
          { id: 2, gems: 250 },
          { id: 3, gems: 500 },
          { id: 4, gems: 1200 },
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
          intent: "CAPTURE" as const,
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
                { id: 1, coins: 1000 }, { id: 2, coins: 2500 },
                { id: 3, coins: 5000 }, { id: 4, coins: 12000 },
              ];
              const gemPacks = [
                { id: 1, gems: 100 }, { id: 2, gems: 250 },
                { id: 3, gems: 500 }, { id: 4, gems: 1200 },
              ];

              const updates: any = {};
              if (packType === 'coins') {
                const pack = coinPacks.find(p => p.id === parseInt(packId));
                if (pack) updates.coins = (user.coins || 0) + pack.coins;
              } else if (packType === 'gems') {
                const pack = gemPacks.find(p => p.id === parseInt(packId));
                if (pack) updates.gems = (user.gems || 0) + pack.gems;
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

  const httpServer = createServer(app);
  return httpServer;
}
