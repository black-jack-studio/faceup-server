import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertGameStatsSchema, insertInventorySchema, insertDailySpinSchema } from "@shared/schema";
import { EconomyManager } from "../client/src/lib/economy";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import Stripe from "stripe";

const MemStore = MemoryStore(session);

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
      req.session.userId = user.id;

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
      req.session.userId = user.id;

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

  // User routes
  app.get("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
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
      const updatedUser = await storage.updateUser(req.session.userId, updates);
      
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Game stats routes
  app.post("/api/stats", requireAuth, async (req, res) => {
    try {
      const statsData = insertGameStatsSchema.parse({
        ...req.body,
        userId: req.session.userId,
      });

      const stats = await storage.createGameStats(statsData);
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/stats/summary", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.session.userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Daily spin routes
  app.get("/api/daily-spin/can-spin", requireAuth, async (req, res) => {
    try {
      const canSpin = await storage.canUserSpin(req.session.userId);
      res.json(canSpin);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/daily-spin", requireAuth, async (req, res) => {
    try {
      const canSpin = await storage.canUserSpin(req.session.userId);
      if (!canSpin) {
        return res.status(400).json({ message: "Already spun today" });
      }

      const reward = EconomyManager.generateDailySpinReward();
      
      // Record spin
      await storage.createDailySpin({
        userId: req.session.userId,
        reward: reward,
      });

      // Apply reward to user
      const user = await storage.getUser(req.session.userId);
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
              userId: req.session.userId,
              itemType: 'card_back',
              itemId: reward.itemId!,
            });
            break;
        }

        if (Object.keys(updates).length > 0) {
          await storage.updateUser(req.session.userId, updates);
        }
      }

      res.json({ reward });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Leaderboard routes
  app.get("/api/leaderboard/weekly", async (req, res) => {
    try {
      const leaderboard = await storage.getWeeklyLeaderboard();
      res.json(leaderboard);
    } catch (error: any) {
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
      
      const user = await storage.getUser(req.session.userId);
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

      await storage.updateUser(req.session.userId, updates);

      // Add item to inventory
      await storage.createInventory({
        userId: req.session.userId,
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
      const inventory = await storage.getUserInventory(req.session.userId);
      res.json(inventory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Achievement routes
  app.get("/api/achievements", requireAuth, async (req, res) => {
    try {
      const achievements = await storage.getUserAchievements(req.session.userId);
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
        apiVersion: "2023-10-16",
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
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
        apiVersion: "2023-10-16",
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

  const httpServer = createServer(app);
  return httpServer;
}
