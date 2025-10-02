import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema';
import { sql } from 'drizzle-orm';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Clés Supabase manquantes !');
  console.error('Vérifiez VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Extraire le project ID depuis l'URL Supabase
const projectId = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
const region = 'eu-central-1'; // Ou extraire depuis l'URL si différent

// Construction de la connection string Supabase
const supabaseDbUrl = `postgresql://postgres.${projectId}:${SUPABASE_KEY}@aws-0-${region}.pooler.supabase.com:6543/postgres`;

console.log('\n🚀 MIGRATION AUTOMATIQUE NEON → SUPABASE');
console.log('='.repeat(60));
console.log(`📡 Supabase Project: ${projectId}`);
console.log(`🌍 Région: ${region}\n`);

async function migrateToSupabase() {
  // Connexion Neon (source)
  const neonPool = new Pool({ connectionString: process.env.DATABASE_URL });
  const neonDb = drizzle(neonPool);

  // Connexion Supabase (destination)
  const supabaseClient = postgres(supabaseDbUrl, { max: 1 });
  const supabaseDb = drizzlePostgres(supabaseClient);

  try {
    console.log('📋 ÉTAPE 1: Création des tables dans Supabase...\n');

    // Lire et exécuter les fichiers SQL de création
    const fs = require('fs');
    const path = require('path');

    const sqlFiles = [
      '01_create_tables.sql',
      '02_create_trigger.sql', 
      '03_add_foreign_keys.sql'
    ];

    for (const file of sqlFiles) {
      const filePath = path.join(process.cwd(), 'supabase_migration', file);
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Fichier manquant: ${file}`);
        continue;
      }

      console.log(`📄 Exécution: ${file}...`);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      
      // Diviser par ';' et exécuter chaque statement
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          await supabaseDb.execute(sql.raw(statement));
        } catch (error: any) {
          if (!error.message.includes('already exists')) {
            console.error(`   ⚠️ Erreur: ${error.message.split('\n')[0]}`);
          }
        }
      }
      console.log(`   ✅ ${file} exécuté\n`);
    }

    console.log('\n📦 ÉTAPE 2: Export des données depuis Neon...\n');

    // Tables à migrer dans l'ordre (respecter les FK)
    const tablesToMigrate = [
      { name: 'users', table: schema.users },
      { name: 'game_stats', table: schema.gameStats },
      { name: 'inventory', table: schema.inventory },
      { name: 'daily_spins', table: schema.dailySpins },
      { name: 'achievements', table: schema.achievements },
      { name: 'challenges', table: schema.challenges },
      { name: 'user_challenges', table: schema.userChallenges },
      { name: 'seasons', table: schema.seasons },
      { name: 'battle_pass_rewards', table: schema.battlePassRewards },
      { name: 'gem_transactions', table: schema.gemTransactions },
      { name: 'gem_purchases', table: schema.gemPurchases },
      { name: 'streak_leaderboard', table: schema.streakLeaderboard },
      { name: 'card_backs', table: schema.cardBacks },
      { name: 'user_card_backs', table: schema.userCardBacks },
      { name: 'bet_drafts', table: schema.betDrafts },
      { name: 'all_in_runs', table: schema.allInRuns },
      { name: 'config', table: schema.config },
      { name: 'friendships', table: schema.friendships },
      { name: 'rank_rewards_claimed', table: schema.rankRewardsClaimed }
    ];

    let totalRows = 0;

    for (const { name, table } of tablesToMigrate) {
      try {
        // Export depuis Neon
        const rows = await neonDb.select().from(table);
        
        if (rows.length === 0) {
          console.log(`⚪ ${name.padEnd(30)} 0 lignes (vide)`);
          continue;
        }

        // Import dans Supabase
        for (const row of rows) {
          try {
            await supabaseDb.insert(table).values(row).onConflictDoNothing();
          } catch (insertError: any) {
            // Si conflit, essayer update
            if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
              try {
                await supabaseDb.insert(table).values(row).onConflictDoUpdate({
                  target: [table.id] as any,
                  set: row as any
                });
              } catch (updateError: any) {
                console.error(`   ❌ Erreur update ${name}:`, updateError.message.split('\n')[0]);
              }
            } else {
              console.error(`   ❌ Erreur insert ${name}:`, insertError.message.split('\n')[0]);
            }
          }
        }

        totalRows += rows.length;
        console.log(`✅ ${name.padEnd(30)} ${rows.length} lignes migrées`);

      } catch (error: any) {
        console.error(`❌ ${name.padEnd(30)} Erreur: ${error.message.split('\n')[0]}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🎉 MIGRATION TERMINÉE: ${totalRows} lignes transférées`);
    console.log('='.repeat(60));

    console.log('\n📊 ÉTAPE 3: Vérification Supabase...\n');

    // Vérifier les counts
    for (const { name, table } of tablesToMigrate.slice(0, 5)) {
      try {
        const result = await supabaseDb.execute(sql.raw(`SELECT COUNT(*) as count FROM ${name}`));
        const rows = result as any;
        const count = rows[0]?.count || 0;
        console.log(`✅ ${name.padEnd(30)} ${count} lignes`);
      } catch (error: any) {
        console.error(`❌ ${name.padEnd(30)} ${error.message.split('\n')[0]}`);
      }
    }

    console.log('\n✅ Migration réussie !');
    console.log('\n📝 Prochaine étape:');
    console.log('   Ajouter dans Secrets: USE_SUPABASE=true');
    console.log('   Puis redémarrer l\'app\n');

  } catch (error: any) {
    console.error('\n❌ ERREUR MIGRATION:', error.message);
    throw error;
  } finally {
    await neonPool.end();
    await supabaseClient.end();
  }
}

migrateToSupabase().catch(console.error);
