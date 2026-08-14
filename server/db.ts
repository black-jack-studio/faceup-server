import "dotenv/config";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import ws from "ws";
import * as schema from "@shared/schema";

const USE_SUPABASE = process.env.USE_SUPABASE === 'true';

// Debug: Log environment variable presence (without revealing values)
console.log('🔍 [DB] Database configuration check:');
console.log(`🔍 [DB] USE_SUPABASE: ${USE_SUPABASE}`);
console.log(`🔍 [DB] PGHOST: ${process.env.PGHOST ? '✅ set' : '❌ missing'}`);
console.log(`🔍 [DB] PGUSER: ${process.env.PGUSER ? '✅ set' : '❌ missing'}`);
console.log(`🔍 [DB] PGPASSWORD: ${process.env.PGPASSWORD ? '✅ set' : '❌ missing'}`);
console.log(`🔍 [DB] PGDATABASE: ${process.env.PGDATABASE ? '✅ set' : '❌ missing'}`);
console.log(`🔍 [DB] SUPABASE_URL: ${process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL ? '✅ set' : '❌ missing'}`);
console.log(`🔍 [DB] SUPABASE_DB_PASSWORD: ${process.env.SUPABASE_DB_PASSWORD ? '✅ set' : '❌ missing'}`);

let pool: any;
let db: any;
// A plain postgres connection string, usable by "pg"-based tools (e.g. connect-pg-simple for
// session storage) that don't understand the Neon serverless or Supabase "postgres" client
// instances used for the main Drizzle connection above.
let sessionConnectionString: string;

if (USE_SUPABASE) {
  // SUPABASE CONNECTION - supports both VITE_ and standard env vars
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabasePassword = process.env.SUPABASE_DB_PASSWORD || '';
  const supabaseRegion = process.env.SUPABASE_REGION || 'eu-west-3';

  if (!supabaseUrl || !supabasePassword) {
    const missing = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL (or VITE_SUPABASE_URL)');
    if (!supabasePassword) missing.push('SUPABASE_DB_PASSWORD');
    throw new Error(
      `Supabase configuration missing: ${missing.join(', ')} required. ` +
      `Current USE_SUPABASE=${USE_SUPABASE}, NODE_ENV=${process.env.NODE_ENV}`
    );
  }

  // Extract project ref from URL (e.g., https://yqganeyurpbdkjaxsgnm.supabase.co)
  const projectRef = supabaseUrl.replace('https://', '').replace('http://', '').split('.')[0];
  const connectionString = `postgresql://postgres.${projectRef}:${supabasePassword}@aws-1-${supabaseRegion}.pooler.supabase.com:5432/postgres`;

  console.log(`🟢 Using SUPABASE DB: postgres.${projectRef}@aws-1-${supabaseRegion}.pooler.supabase.com`);

  const supabaseClient = postgres(connectionString, { prepare: false, max: 10 });
  pool = supabaseClient;
  db = drizzlePostgres(supabaseClient, { schema });
  sessionConnectionString = connectionString;

} else {
  // NEON CONNECTION (default)
  neonConfig.webSocketConstructor = ws;

  const dbConfig = {
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  };

  const missing = [];
  if (!dbConfig.host) missing.push('PGHOST');
  if (!dbConfig.user) missing.push('PGUSER');
  if (!dbConfig.password) missing.push('PGPASSWORD');
  if (!dbConfig.database) missing.push('PGDATABASE');

  if (missing.length > 0) {
    throw new Error(
      `Database configuration incomplete. Missing: ${missing.join(', ')}. ` +
      `If you're using Supabase, set USE_SUPABASE=true. ` +
      `Current USE_SUPABASE=${USE_SUPABASE}, NODE_ENV=${process.env.NODE_ENV}`
    );
  }

  console.log(`🔵 Using NEON DB: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  pool = new Pool(dbConfig);
  db = drizzleNeon({ client: pool, schema });
  sessionConnectionString =
    `postgresql://${encodeURIComponent(dbConfig.user!)}:${encodeURIComponent(dbConfig.password!)}` +
    `@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
}

export { pool, db, sessionConnectionString };