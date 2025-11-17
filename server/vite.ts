import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Try multiple path resolution strategies to work with different build setups
  // After esbuild bundling, the code is in dist/, and static files are in dist/public
  let distPath: string;
  
  try {
    // Strategy 1: Relative to bundled file location (dist/public)
    // After esbuild, __dirname will be the dist/ directory
    distPath = path.resolve(__dirname, "public");
    console.log(`🔍 [DEBUG] Trying path strategy 1: ${distPath}`);
    
    // Strategy 2: If that doesn't exist, try from process.cwd() (project root)
    if (!fs.existsSync(distPath)) {
      console.log(`⚠️  Path ${distPath} not found, trying process.cwd()...`);
      distPath = path.resolve(process.cwd(), "dist", "public");
      console.log(`🔍 [DEBUG] Trying path strategy 2: ${distPath}`);
    }
    
    console.log(`📁 Serving static files from: ${distPath}`);
    console.log(`🔍 [DEBUG] __dirname: ${__dirname}`);
    console.log(`🔍 [DEBUG] process.cwd(): ${process.cwd()}`);
    console.log(`🔍 [DEBUG] Path exists: ${fs.existsSync(distPath)}`);
    
    if (!fs.existsSync(distPath)) {
      // Log detailed error but don't throw - allow server to start anyway
      console.error(`❌ Could not find the build directory: ${distPath}`);
      console.error(`❌ Current working directory: ${process.cwd()}`);
      console.error(`❌ __dirname: ${__dirname}`);
      console.error(`❌ This is non-fatal - server will start but static files won't be served`);
      
      // Return early but don't throw - let the server start
      // The routes will still work, just no static file serving
      return;
    }
    
    console.log(`✅ Static directory found: ${distPath}`);
    app.use(express.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res, next) => {
      const indexPath = path.resolve(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`❌ index.html not found at: ${indexPath}`);
        res.status(404).send("Not Found");
      }
    });
  } catch (error) {
    console.error("❌ Error setting up static file serving:", error);
    console.error("❌ Error stack:", (error as Error).stack);
    // Don't throw - allow server to start even if static serving fails
    console.error("⚠️  Server will continue without static file serving");
  }
}
