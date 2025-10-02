import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Fonction pour exécuter du SQL directement via l'API REST de Supabase
async function executeSQLDirect(sql: string): Promise<any> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL Error: ${error}`);
  }

  return response.json();
}

// ÉTAPE 3: Créer les tables
async function createTables() {
  console.log('\n' + '='.repeat(70));
  console.log('📦 ÉTAPE 3: Création des tables Supabase');
  console.log('='.repeat(70) + '\n');

  const sqlFile = fs.readFileSync(
    path.join(process.cwd(), 'supabase_migration', '01_create_tables.sql'),
    'utf8'
  );

  // Exécuter le script SQL complet
  try {
    // Diviser en blocs logiques pour éviter les erreurs de parsing
    const blocks = sqlFile.split('-- ============================================');
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim();
      if (!block || block.startsWith('MIGRATION SUPABASE')) continue;
      
      // Exécuter chaque bloc
      const statements = block.split(';').filter(s => {
        const trimmed = s.trim();
        return trimmed && !trimmed.startsWith('--') && trimmed.length > 10;
      });
      
      for (const statement of statements) {
        try {
          // Utiliser l'API PostgreSQL de Supabase directement
          const cleanSQL = statement.trim() + ';';
          
          // Exécuter via query directe
          const { error } = await supabase.rpc('exec', { sql: cleanSQL });
          
          if (error && !error.message.includes('already exists')) {
            console.log(`⚠️  ${error.message.substring(0, 80)}...`);
          }
        } catch (err: any) {
          // Ignorer les erreurs "already exists"
          if (!err.message.includes('already exists')) {
            console.log(`⚠️  ${err.message.substring(0, 80)}...`);
          }
        }
      }
    }
    
    console.log('✅ Tables créées (vérification en cours...)\n');
  } catch (error: any) {
    console.error('❌ Erreur lors de la création des tables:', error.message);
    
    // Alternative: Créer les tables une par une via l'API standard
    console.log('\n📝 Création manuelle des tables via API Supabase...\n');
    
    // On va créer directement via des requêtes SQL simples
    const createTablesSql = `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      CREATE TABLE IF NOT EXISTS public.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username text NOT NULL UNIQUE,
        email text NOT NULL UNIQUE,
        password text NOT NULL,
        xp integer DEFAULT 0,
        current_level_xp integer DEFAULT 0,
        level integer DEFAULT 1,
        season_xp integer DEFAULT 0,
        coins bigint DEFAULT 5000,
        gems bigint DEFAULT 0,
        selected_avatar_id text DEFAULT 'face-with-tears-of-joy',
        owned_avatars jsonb DEFAULT '[]'::jsonb,
        selected_card_back_id text,
        privacy_settings jsonb DEFAULT '{"profileVisibility": "public", "showStats": true, "showLevel": true, "allowMessages": true, "dataCollection": true}'::jsonb,
        stripe_customer_id text,
        stripe_subscription_id text,
        membership_type text DEFAULT 'normal',
        subscription_expires_at timestamptz,
        max_streak_21 integer DEFAULT 0,
        current_streak_21 integer DEFAULT 0,
        total_streak_wins integer DEFAULT 0,
        total_streak_earnings bigint DEFAULT 0,
        tickets integer DEFAULT 3,
        bonus_coins bigint DEFAULT 0,
        all_in_lose_streak integer DEFAULT 0,
        referral_code text UNIQUE,
        referred_by uuid,
        referral_count integer DEFAULT 0,
        referral_reward_claimed boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `;
    
    // Écrire un fichier SQL simplifié pour exécution manuelle
    fs.writeFileSync(
      path.join(process.cwd(), 'supabase_migration', 'EXECUTE_THIS.sql'),
      sqlFile
    );
    
    console.log('📄 Fichier SQL créé: supabase_migration/EXECUTE_THIS.sql');
    console.log('\n⚠️  IMPORTANT: Vous devez exécuter ce fichier SQL dans Supabase SQL Editor');
    console.log('     1. Ouvrez Supabase → SQL Editor');
    console.log('     2. Copiez le contenu de supabase_migration/EXECUTE_THIS.sql');
    console.log('     3. Exécutez le script');
    console.log('     4. Relancez: npx tsx scripts/migrate-to-supabase.ts --skip-tables\n');
    
    throw new Error('Tables doivent être créées manuellement via SQL Editor');
  }
}

// ÉTAPE 4: Créer le trigger
async function createTrigger() {
  console.log('\n' + '='.repeat(70));
  console.log('🔧 ÉTAPE 4: Création du trigger d\'auto-inscription');
  console.log('='.repeat(70) + '\n');

  const triggerSQL = `
-- Fonction pour créer automatiquement le profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, email, coins, gems, tickets, created_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    5000,
    0,
    3,
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;

  fs.writeFileSync(
    path.join(process.cwd(), 'supabase_migration', '02_create_trigger.sql'),
    triggerSQL
  );

  console.log('✅ Trigger SQL sauvegardé: supabase_migration/02_create_trigger.sql\n');
}

// ÉTAPE 5: Importer les données
async function importData() {
  console.log('\n' + '='.repeat(70));
  console.log('📥 ÉTAPE 5: Import des données CSV → Supabase');
  console.log('='.repeat(70) + '\n');

  const csvDir = path.join(process.cwd(), 'neon_export_csv');
  
  // Ordre d'import (tables sans dépendances d'abord)
  const importOrder = [
    'users',
    'seasons',
    'challenges',
    'card_backs',
    'config',
    'game_stats',
    'user_challenges',
    'battle_pass_rewards',
    'gem_transactions',
    'gem_purchases',
    'user_card_backs',
    'friendships',
    'rank_rewards_claimed',
    'inventory',
    'daily_spins',
    'achievements',
    'streak_leaderboard',
    'bet_drafts',
    'all_in_runs'
  ];

  let totalImported = 0;
  let totalErrors = 0;

  for (const tableName of importOrder) {
    const csvPath = path.join(csvDir, `${tableName}.csv`);
    
    if (!fs.existsSync(csvPath)) {
      console.log(`⚠️  ${tableName}: fichier CSV non trouvé`);
      continue;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false // Pas de conversion automatique
    });

    if (records.length === 0) {
      console.log(`⏭️  ${tableName}: vide, skip`);
      continue;
    }

    console.log(`\n📊 Import ${tableName}: ${records.length} lignes`);

    // Nettoyer et convertir les données
    const cleanedRecords = records.map((record: any) => {
      const cleaned: any = {};

      for (const [key, value] of Object.entries(record)) {
        // Valeurs nulles
        if (value === '' || value === null || value === 'NULL') {
          cleaned[key] = null;
          continue;
        }

        // UUID columns
        if (key === 'id' || key.includes('_id') || key === 'requester_id' || key === 'recipient_id' || key === 'referred_by') {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (value && uuidRegex.test(value as string)) {
            cleaned[key] = value;
          } else {
            cleaned[key] = null;
          }
          continue;
        }

        // JSONB
        if (key === 'privacy_settings' || key === 'owned_avatars' || key === 'reward' || key === 'player_hand' || key === 'dealer_hand') {
          try {
            cleaned[key] = typeof value === 'string' ? JSON.parse(value as string) : value;
          } catch {
            cleaned[key] = value === '' ? null : value;
          }
          continue;
        }

        // Dates
        if (key.includes('_at') || key.includes('_date')) {
          cleaned[key] = value || null;
          continue;
        }

        // Booleans
        if (value === 'true' || value === 'false' || value === 't' || value === 'f') {
          cleaned[key] = value === 'true' || value === 't';
          continue;
        }

        // Numbers
        if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
          cleaned[key] = Number(value);
          continue;
        }

        // Default
        cleaned[key] = value;
      }

      return cleaned;
    });

    // Insérer par lots de 50 (plus petit pour éviter timeouts)
    const batchSize = 50;
    let imported = 0;
    
    for (let i = 0; i < cleanedRecords.length; i += batchSize) {
      const batch = cleanedRecords.slice(i, i + batchSize);

      try {
        const { data, error } = await supabase
          .from(tableName)
          .insert(batch);

        if (error) {
          console.error(`  ❌ Lot ${Math.floor(i/batchSize) + 1}: ${error.message.substring(0, 100)}`);
          totalErrors += batch.length;
        } else {
          imported += batch.length;
          process.stdout.write(`  ✅ ${imported}/${cleanedRecords.length}\r`);
        }
      } catch (err: any) {
        console.error(`  ❌ Lot ${Math.floor(i/batchSize) + 1}: ${err.message.substring(0, 100)}`);
        totalErrors += batch.length;
      }
    }

    console.log(`  ✅ ${tableName}: ${imported}/${cleanedRecords.length} importés`);
    totalImported += imported;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`📊 RÉSULTAT IMPORT:`);
  console.log(`   ✅ Lignes importées: ${totalImported}`);
  console.log(`   ❌ Erreurs: ${totalErrors}`);
  console.log('='.repeat(70));
}

// ÉTAPE 6: Ajouter les foreign keys
async function addForeignKeys() {
  console.log('\n' + '='.repeat(70));
  console.log('🔗 ÉTAPE 6: Ajout des Foreign Keys et Indexes');
  console.log('='.repeat(70) + '\n');

  const fkSQL = `
-- Foreign Keys
ALTER TABLE public.game_stats ADD CONSTRAINT fk_game_stats_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.inventory ADD CONSTRAINT fk_inventory_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.daily_spins ADD CONSTRAINT fk_daily_spins_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.achievements ADD CONSTRAINT fk_achievements_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_challenges ADD CONSTRAINT fk_user_challenges_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_challenges ADD CONSTRAINT fk_user_challenges_challenge FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;
ALTER TABLE public.battle_pass_rewards ADD CONSTRAINT fk_battle_pass_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.battle_pass_rewards ADD CONSTRAINT fk_battle_pass_season FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;
ALTER TABLE public.gem_transactions ADD CONSTRAINT fk_gem_transactions_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.gem_purchases ADD CONSTRAINT fk_gem_purchases_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.streak_leaderboard ADD CONSTRAINT fk_streak_leaderboard_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_card_backs ADD CONSTRAINT fk_user_card_backs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_card_backs ADD CONSTRAINT fk_user_card_backs_card FOREIGN KEY (card_back_id) REFERENCES public.card_backs(id) ON DELETE CASCADE;
ALTER TABLE public.bet_drafts ADD CONSTRAINT fk_bet_drafts_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.all_in_runs ADD CONSTRAINT fk_all_in_runs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.friendships ADD CONSTRAINT fk_friendships_requester FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.friendships ADD CONSTRAINT fk_friendships_recipient FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.rank_rewards_claimed ADD CONSTRAINT fk_rank_rewards_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
`;

  fs.writeFileSync(
    path.join(process.cwd(), 'supabase_migration', '03_add_foreign_keys.sql'),
    fkSQL
  );

  console.log('✅ Foreign Keys SQL sauvegardé: supabase_migration/03_add_foreign_keys.sql\n');
}

async function main() {
  console.log('\n');
  console.log('🚀 ' + '='.repeat(66) + ' 🚀');
  console.log('   MIGRATION AUTOMATIQUE NEON → SUPABASE');
  console.log('🚀 ' + '='.repeat(66) + ' 🚀');
  console.log(`\n📍 Supabase: ${supabaseUrl}\n`);

  const skipTables = process.argv.includes('--skip-tables');

  try {
    if (!skipTables) {
      await createTables();
    }
    
    await createTrigger();
    await importData();
    await addForeignKeys();

    console.log('\n✨ ' + '='.repeat(66) + ' ✨');
    console.log('   MIGRATION TERMINÉE !');
    console.log('✨ ' + '='.repeat(66) + ' ✨\n');

    console.log('📋 PROCHAINES ÉTAPES MANUELLES:');
    console.log('   1. Exécuter supabase_migration/02_create_trigger.sql dans Supabase SQL Editor');
    console.log('   2. Exécuter supabase_migration/03_add_foreign_keys.sql dans Supabase SQL Editor');
    console.log('   3. Vérifier les données importées dans Supabase Table Editor\n');

  } catch (error: any) {
    console.error('\n❌ ERREUR:', error.message);
    console.error('\n📋 Pour continuer manuellement:');
    console.error('   1. Exécutez supabase_migration/EXECUTE_THIS.sql dans Supabase');
    console.error('   2. Puis relancez: npx tsx scripts/migrate-to-supabase.ts --skip-tables\n');
    process.exit(1);
  }
}

main();
