import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use built-in database environment variables instead of potentially problematic DATABASE_URL
const dbConfig = {
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
};

// Validate that we have the required database configuration
if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
  throw new Error(
    "Database configuration incomplete. Missing PGHOST, PGUSER, PGPASSWORD, or PGDATABASE environment variables.",
  );
}

export const pool = new Pool(dbConfig);
export const db = drizzle({ client: pool, schema });

// Debug: Log database connection info
console.log('🔍 Database connection config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database
});

// Test connection and schema
pool.query('SELECT current_database(), current_schema();').then((result) => {
  console.log('✅ Connected to database:', result.rows[0]);
}).catch((err) => {
  console.error('❌ Database connection test failed:', err);
});