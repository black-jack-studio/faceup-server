import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedCardBacks } from "./seedCardBacks";
import { storage } from "./storage";
import { runReferralMigration } from "./referral-migration";
import { generateReferralCodesForExistingUsers } from "./utils/generate-referral-codes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

console.log("🔍 [DEBUG] App initialized");

// ✅ Health check endpoint (Render requirement)
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

console.log("🔍 [DEBUG] Health check route registered");

// ✅ Simple middleware for logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  
  next();
});

console.log("🔍 [DEBUG] Logging middleware registered");

const port = parseInt(process.env.PORT || "10000", 10);
console.log(`🔍 [DEBUG] Port set to: ${port}`);

// ✅ Main bootstrap
async function startServer() {
  try {
    console.log("🔍 [DEBUG] Starting server bootstrap...");
    
    console.log("🔍 [DEBUG] Step 1: Card backs initialization");
    console.log("🎴 Initializing card backs before server startup...");
    
    if (process.env.NODE_ENV === "development" || process.env.SEED_CARD_BACKS === "true") {
      console.log("🔍 [DEBUG] Seeding card backs (dev mode or SEED_CARD_BACKS=true)");
      await seedCardBacks();
      
      console.log("🔍 [DEBUG] Syncing card backs from JSON");
      const syncResult = await storage.syncCardBacksFromJson();
      console.log(`✅ JSON Sync complete: ${syncResult.synced} new, ${syncResult.skipped} existing`);
    } else {
      console.log("⚠️ Skipping card back seeding - not in development mode and SEED_CARD_BACKS not enabled");
    }
    
    console.log("🔍 [DEBUG] Step 2: Running referral migration");
    await runReferralMigration();
    console.log("🔍 [DEBUG] Referral migration complete");
    
    console.log("🔍 [DEBUG] Step 3: Generating referral codes");
    await generateReferralCodesForExistingUsers();
    console.log("🔍 [DEBUG] Referral codes generated");
    
    console.log("🔍 [DEBUG] Step 4: Registering routes");
    await registerRoutes(app);
    console.log("🔍 [DEBUG] Routes registered");
    
    console.log("🔍 [DEBUG] Step 5: Setting up Vite or static serving");
    if (app.get("env") === "development") {
      console.log("🔍 [DEBUG] Development mode - setting up Vite");
      await setupVite(app);
    } else {
      console.log("🔍 [DEBUG] Production mode - serving static files");
      serveStatic(app);
    }
    console.log("🔍 [DEBUG] Vite/static setup complete");
    
    console.log("🔍 [DEBUG] Step 6: Starting Express listener");
    console.log(`🔍 [DEBUG] Attempting to listen on 0.0.0.0:${port}`);
    
    // ✅ Listen and keep process alive
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server ready - listening on port ${port}`);
      console.log(`🔍 [DEBUG] Express is now accepting connections`);
    });
    
    server.on('error', (err: any) => {
      console.error("❌ Server listen error:", err);
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`);
      }
      process.exit(1);
    });
    
    console.log("🔍 [DEBUG] app.listen() called successfully");
    
  } catch (err) {
    console.error("❌ Fatal startup error:", err);
    console.error("❌ Error stack:", (err as Error).stack);
    process.exit(1);
  }
}

console.log("🔍 [DEBUG] Calling startServer()...");

// 🚀 Démarrage du serveur
startServer()
  .then(() => {
    console.log("✅ Server bootstrap complete and running");

    // 🟢 Garde le process vivant sur Render (empêche fermeture)
    setInterval(() => {
      // Ping interne toutes les 5 minutes pour garder le process actif
      console.log("💡 Keep-alive ping");
    }, 5 * 60 * 1000);
  })
  .catch((err) => {
    console.error("❌ Unhandled error in startServer:", err);
    process.exit(1);
  });


