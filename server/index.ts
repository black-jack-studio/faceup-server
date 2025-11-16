import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { seedCardBacks } from "./seedCardBacks";
import { storage } from "./storage";
import { runReferralMigration } from "./referral-migration";
import { generateReferralCodesForExistingUsers } from "./utils/generate-referral-codes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

console.log("🔍 [DEBUG] App initialized");

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
console.log("🔍 [DEBUG] Health check route registered");

// Logging middleware
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

const port = Number(process.env.PORT ?? "10000");
console.log(`🔍 [DEBUG] Port set to: ${port}`);

async function startServer() {
  console.log("🔍 [DEBUG] Starting server bootstrap...");

  // 1) Créer le serveur HTTP tout de suite
  const server = createServer(app);

  // 2) Vite / static
  if (app.get("env") === "development") {
    console.log("🔍 [DEBUG] Development mode - setting up Vite");
    await setupVite(app, server);
  } else {
    console.log("🔍 [DEBUG] Production mode - serving static files");
    serveStatic(app);
  }

  console.log("🔍 [DEBUG] Vite/static setup complete");
  console.log("🔍 [DEBUG] Starting Express listener");
  console.log(`🔍 [DEBUG] Attempting to listen on 0.0.0.0:${port}`);

  server.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server ready - listening on port ${port}`);
    console.log("🔍 [DEBUG] Express is now accepting connections");
  });

  server.on("error", (err: any) => {
    console.error("❌ Server listen error:", err);
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${port} is already in use`);
    }
    // ⚠️ NE PAS faire process.exit ici, Render gère les redémarrages
  });

  server.keepAliveTimeout = 120 * 1000;
  server.headersTimeout = 125 * 1000;
  setInterval(() => console.log("💡 Render keep-alive"), 4 * 60 * 1000);

  console.log("🔍 [DEBUG] app.listen() called successfully");

  // 3) Lancer les tâches lourdes en arrière-plan (sans bloquer le serveur)
  (async () => {
    try {
      console.log("🔍 [DEBUG] Background task: card backs init + migrations");

      if (process.env.NODE_ENV === "development" || process.env.SEED_CARD_BACKS === "true") {
        console.log("🔍 [DEBUG] Seeding card backs (dev mode or SEED_CARD_BACKS=true)");
        await seedCardBacks();

        console.log("🔍 [DEBUG] Syncing card backs from JSON");
        const syncResult = await storage.syncCardBacksFromJson();
        console.log(
          `✅ JSON Sync complete: ${syncResult.synced} new, ${syncResult.skipped} existing`
        );
      } else {
        console.log(
          "⚠️ Skipping card back seeding - not in development mode and SEED_CARD_BACKS not enabled"
        );
      }

      console.log("🔍 [DEBUG] Running referral migration");
      await runReferralMigration();
      console.log("🔍 [DEBUG] Referral migration complete");

      console.log("🔍 [DEBUG] Generating referral codes");
      await generateReferralCodesForExistingUsers();
      console.log("🔍 [DEBUG] Referral codes generated");
    } catch (err) {
      console.error("❌ Background init error:", err);
    }
  })();
}

console.log("🔍 [DEBUG] Calling startServer()...");

startServer().catch((err) => {
  console.error("❌ Unhandled error during startup:", err);
  // ❌ Ne pas faire process.exit ici non plus : Render relancera si crash réel
});
