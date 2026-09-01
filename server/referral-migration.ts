import { pool } from './db';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runReferralMigration() {
  // 🔒 On ne lance la migration qu'en développement
  if (process.env.NODE_ENV === 'production') {
    console.log('ℹ️ Skipping referral migration in production');
    return;
  }

  try {
    const sql = await fs.readFile(
      path.join(__dirname, 'migrations', 'add-referral-columns.sql'),
      'utf-8'
    );
    
    // `pool` is a node-postgres Pool (Neon/prod) when it exposes `.query`, or a `postgres`
    // package client (Supabase/local — see db.ts) which has no `.query` and must be called via
    // `.unsafe()` instead. Duck-typed so this keeps working if either driver is swapped again,
    // and so a client type it doesn't recognize fails loudly instead of hitting the catch below.
    if (typeof pool.query === 'function') {
      await pool.query(sql);
    } else if (typeof pool.unsafe === 'function') {
      await pool.unsafe(sql);
    } else {
      throw new Error('Unrecognized DB client: neither .query nor .unsafe is available on pool');
    }
    console.log('✅ Referral system columns added successfully');
  } catch (error: any) {
    // Ignore if columns already exist
    if (error.code === '42701') {
      console.log('ℹ️  Referral columns already exist');
    } else {
      console.error('❌ Error running referral migration:', error.message);
    }
  }
}