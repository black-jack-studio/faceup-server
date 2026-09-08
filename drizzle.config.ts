import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// This CLI (unlike the app itself) never went through server/db.ts, so it never actually got a
// DATABASE_URL -- the app's real Supabase connection is built at runtime from SUPABASE_URL +
// SUPABASE_DB_PASSWORD (see db.ts's USE_SUPABASE branch), not from a DATABASE_URL env var. Same
// construction here, so `npm run db:push` resolves the same database the app itself talks to.
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabasePassword = process.env.SUPABASE_DB_PASSWORD;
  if (supabaseUrl && supabasePassword) {
    const region = process.env.SUPABASE_REGION || "eu-west-3";
    // 5432 (session-mode pooler) matches server/db.ts's own hardcoded port -- overridable here
    // only for diagnosing whether a given network can reach it at all, e.g. some ISPs/routers
    // block 5432 outbound but allow 6543 (transaction-mode pooler).
    const port = process.env.SUPABASE_DB_PORT || "5432";
    const projectRef = supabaseUrl.replace(/^https?:\/\//, "").split(".")[0];
    return `postgresql://postgres.${projectRef}:${encodeURIComponent(supabasePassword)}@aws-1-${region}.pooler.supabase.com:${port}/postgres`;
  }

  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
});
