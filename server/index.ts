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

// ✅ Health check endpoint (Render requirement)
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// ✅ Simple middleware for logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

const port = parseInt(process.env.PORT || "10000", 10);

// ✅ Main bootstrap
async function startServer() {
  try {
    log("🎴 Initializing card backs before server startup...");

    if (process.env.NODE_ENV === "development" || process.env.SEED_CARD_BACKS === "true") {
      await seedCardBacks();
      const syncResult = await storage.syncCardBacksFromJson();
      log(`✅ JSON Sync complete: ${syncResult.synced} new, ${syncResult.skipped} existing`);
    } else {
      log("⚠️ Skipping card back seeding - not in development mode and SEED_CARD_BACKS not enabled");
    }

    await runReferralMigration();
    await generateReferralCodesForExistingUsers();
    await registerRoutes(app);

    if (app.get("env") === "development") {
      await setupVite(app);
    } else {
      serveStatic(app);
    }

    // ✅ Listen and keep process alive
    app.listen(port, "0.0.0.0", () => {
      log(`🚀 Server ready - listening on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Fatal startup error:", err);
    process.exit(1);
  }
}

// 🚀 Start app
startServer();
