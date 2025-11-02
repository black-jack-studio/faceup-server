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

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 120) logLine = logLine.slice(0, 119) + "…";
      log(logLine);
    }
  });

  next();
});

const port = parseInt(process.env.PORT || "10000", 10);

// 🚀 Main bootstrap
(async () => {
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

    // ✅ C’est ça qui manquait : lancer le serveur Express et garder le process vivant
    app.listen(port, "0.0.0.0", () => {
      log(`🚀 Server ready - listening on port ${port}`);
      log("✅ Server fully initialized and stable.");
    });
  } catch (err) {
    console.error("❌ Fatal error on startup:", err);
    process.exit(1);
  }
})();
