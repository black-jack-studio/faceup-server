import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const sinceArg = args.find(arg => arg.startsWith('--since='));
const sinceDate = sinceArg ? sinceArg.split('=')[1] : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

console.log('\n🔄 EXPORT DELTA NEON → SUPABASE');
console.log('='.repeat(50));

// CRITICAL: Verify we're reading from Neon, not Supabase
const useSupabase = process.env.USE_SUPABASE === 'true';
if (useSupabase) {
  console.error('\n❌ ERREUR CRITIQUE: USE_SUPABASE=true détecté !');
  console.error('⚠️  Le script lirait depuis Supabase au lieu de Neon');
  console.error('💡 Solution: USE_SUPABASE=false puis relancer le script\n');
  process.exit(1);
}

console.log('✅ Connexion vérifiée: NEON (mode correct)');
console.log(`📅 Export des changements depuis: ${sinceDate}\n`);

// Tables avec updated_at pour tracking des changements
const tablesWithTimestamp = [
  'users',
  'game_stats', 
  'gem_transactions',
  'gem_purchases',
  'friendships',
  'user_challenges',
  'daily_spins',
  'bet_drafts',
  'all_in_runs'
];

// Tables sans timestamp - export complet si nécessaire
const tablesWithoutTimestamp = [
  'seasons',
  'challenges',
  'card_backs',
  'config',
  'inventory',
  'achievements',
  'battle_pass_rewards',
  'streak_leaderboard',
  'user_card_backs',
  'rank_rewards_claimed'
];

async function exportDelta() {
  const migrationDir = path.join(process.cwd(), 'supabase_migration');
  let deltaSQL = `-- ============================================\n`;
  deltaSQL += `-- DELTA IMPORT\n`;
  deltaSQL += `-- Nouvelles données depuis ${sinceDate}\n`;
  deltaSQL += `-- ============================================\n\n`;

  let totalNewRows = 0;

  // Export tables avec updated_at
  for (const tableName of tablesWithTimestamp) {
    try {
      const query = sql.raw(`
        SELECT * FROM ${tableName} 
        WHERE updated_at >= '${sinceDate}'::timestamp
        ORDER BY updated_at ASC
      `);
      
      const result = await db.execute(query);
      const rows = result.rows as any[];

      if (rows.length === 0) {
        console.log(`⚪ ${tableName.padEnd(25)} 0 nouvelles lignes`);
        continue;
      }

      console.log(`📦 ${tableName.padEnd(25)} ${rows.length} nouvelles lignes`);
      totalNewRows += rows.length;

      deltaSQL += `\n-- Table: ${tableName} (${rows.length} nouvelles lignes)\n`;

      for (const record of rows) {
        const columns = Object.keys(record);
        const values = columns.map(col => {
          const val = record[col];
          
          if (val === null || val === undefined) return 'NULL';
          
          // JSONB
          if (col === 'privacy_settings' || col === 'owned_avatars' || col === 'reward' || col === 'player_hand' || col === 'dealer_hand') {
            try {
              const jsonStr = typeof val === 'string' ? val : JSON.stringify(val);
              return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
            } catch {
              return 'NULL';
            }
          }
          
          // Booleans
          if (typeof val === 'boolean') return val ? 'true' : 'false';
          
          // Numbers
          if (typeof val === 'number') return val.toString();
          
          // Dates
          if (val instanceof Date || (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/))) {
            return `'${val.toString()}'`;
          }
          
          // Strings
          return `'${val.toString().replace(/'/g, "''")}'`;
        });

        // ON CONFLICT UPDATE pour les deltas
        deltaSQL += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO UPDATE SET `;
        const updates = columns.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(', ');
        deltaSQL += updates + ';\n';
      }
    } catch (error: any) {
      console.error(`❌ Erreur ${tableName}:`, error.message);
    }
  }

  // Pour les tables sans timestamp, export complet avec ON CONFLICT
  console.log('\n📊 Tables sans timestamp (export complet recommandé):');
  deltaSQL += `\n-- ============================================\n`;
  deltaSQL += `-- TABLES SANS TIMESTAMP - EXPORT COMPLET\n`;
  deltaSQL += `-- Ces tables n'ont pas updated_at, import complet pour sécurité\n`;
  deltaSQL += `-- ============================================\n\n`;

  for (const tableName of tablesWithoutTimestamp) {
    try {
      const result = await db.execute(sql.raw(`SELECT * FROM ${tableName}`));
      const rows = result.rows as any[];
      const count = rows.length;
      console.log(`⚠️  ${tableName.padEnd(25)} ${count} lignes (export complet car pas de timestamp)`);

      if (rows.length > 0) {
        deltaSQL += `\n-- Table: ${tableName} (${rows.length} lignes - export complet)\n`;

        for (const record of rows) {
          const columns = Object.keys(record);
          const values = columns.map(col => {
            const val = record[col];
            
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'boolean') return val ? 'true' : 'false';
            if (typeof val === 'number') return val.toString();
            if (val instanceof Date || (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/))) {
              return `'${val.toString()}'`;
            }
            
            // JSONB
            if (typeof val === 'object') {
              try {
                const jsonStr = JSON.stringify(val);
                return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
              } catch {
                return 'NULL';
              }
            }
            
            return `'${val.toString().replace(/'/g, "''")}'`;
          });

          // ON CONFLICT UPDATE pour synchroniser les modifications
          const updates = columns.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(', ');
          deltaSQL += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO UPDATE SET ${updates};\n`;
        }
      }
    } catch (error: any) {
      console.error(`❌ ${tableName}:`, error.message);
    }
  }

  console.log('\n⚠️  IMPORTANT: Tables sans timestamp = export complet inclus dans delta');
  console.log('💡 Utilise ON CONFLICT DO NOTHING pour éviter les doublons');

  // Sauvegarder le fichier delta
  const deltaFile = path.join(migrationDir, '05_import_delta.sql');
  fs.writeFileSync(deltaFile, deltaSQL);

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Fichier delta créé: ${deltaFile}`);
  console.log(`📊 Total nouvelles lignes: ${totalNewRows}`);
  
  if (totalNewRows === 0) {
    console.log('\n⚠️  AUCUNE NOUVELLE DONNÉE depuis le dernier export');
    console.log('💡 Vous pouvez basculer vers Supabase en toute sécurité\n');
  } else {
    console.log('\n⚠️  IMPORTANT: Exécutez 05_import_delta.sql dans Supabase AVANT de basculer');
    console.log('💡 Supabase SQL Editor → Coller et exécuter 05_import_delta.sql\n');
  }

  process.exit(0);
}

exportDelta().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
