import { pool } from './db';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Same shape as runReferralMigration (see referral-migration.ts) — an idempotent, IF NOT
// EXISTS-guarded column add, run from a local dev session against the shared dev/prod DB
// rather than the deployed prod process itself.
export async function runOnboardingMigration() {
  // 🔒 On ne lance la migration qu'en développement
  if (process.env.NODE_ENV === 'production') {
    console.log('ℹ️ Skipping onboarding migration in production');
    return;
  }

  try {
    const sql = await fs.readFile(
      path.join(__dirname, 'migrations', 'add-has-completed-onboarding-column.sql'),
      'utf-8'
    );

    // `pool` is a node-postgres Pool (Neon/prod) when it exposes `.query`, or a `postgres`
    // package client (Supabase/local — see db.ts) which has no `.query` and must be called via
    // `.unsafe()` instead — same duck-typing as runReferralMigration.
    if (typeof pool.query === 'function') {
      await pool.query(sql);
    } else if (typeof pool.unsafe === 'function') {
      await pool.unsafe(sql);
    } else {
      throw new Error('Unrecognized DB client: neither .query nor .unsafe is available on pool');
    }
    console.log('✅ Onboarding column added successfully');
  } catch (error: any) {
    if (error.code === '42701') {
      console.log('ℹ️  Onboarding column already exists');
    } else {
      console.error('❌ Error running onboarding migration:', error.message);
    }
  }
}
