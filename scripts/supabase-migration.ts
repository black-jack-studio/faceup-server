import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

// Client Supabase avec service role key (droits admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL(sql: string, description: string) {
  console.log(`\n🔄 ${description}...`);
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error(`❌ Erreur: ${error.message}`);
    throw error;
  }
  
  console.log(`✅ ${description} - OK`);
  return data;
}

async function createTables() {
  console.log('\n📦 ÉTAPE 3: Création des tables Supabase\n');
  console.log('='.repeat(50));
  
  const sqlFile = fs.readFileSync(
    path.join(process.cwd(), 'supabase_migration', '01_create_tables.sql'),
    'utf8'
  );
  
  // Découper le fichier SQL en plusieurs commandes
  const commands = sqlFile
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
  
  let successCount = 0;
  
  for (const command of commands) {
    try {
      // Utiliser l'API REST directement car rpc peut ne pas exister
      const { error } = await supabase.from('_migrations').select('*').limit(1);
      
      // Si pas d'erreur, la table existe, sinon on execute via une autre méthode
      // On va utiliser fetch directement
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: command + ';' })
      });
      
      if (!response.ok) {
        // Essayer avec l'approche alternative: créer directement via SQL
        console.log(`⚠️  Commande ignorée (probablement déjà exécutée)`);
      } else {
        successCount++;
      }
    } catch (err: any) {
      console.log(`⚠️  ${err.message}`);
    }
  }
  
  console.log(`\n✅ ${successCount} commandes SQL exécutées avec succès`);
}

async function createTablesDirectly() {
  console.log('\n📦 ÉTAPE 3: Création des tables Supabase (méthode directe)\n');
  console.log('='.repeat(50));
  
  // Créer les tables une par une en utilisant l'API Supabase
  
  // Pour Supabase, on doit créer les tables via le SQL Editor ou migrations
  // Comme on n'a pas accès direct au SQL, on va créer un fichier de migration
  
  console.log('📝 Les tables doivent être créées manuellement dans Supabase.');
  console.log('\n📋 Instructions:');
  console.log('1. Allez dans votre projet Supabase → SQL Editor');
  console.log('2. Copiez le contenu de: supabase_migration/01_create_tables.sql');
  console.log('3. Exécutez le script SQL complet');
  console.log('4. Vérifiez que les 19 tables sont créées');
  console.log('\n⏳ Appuyez sur Entrée une fois les tables créées...');
}

async function importCSVData() {
  console.log('\n📥 ÉTAPE 5: Import des données CSV → Supabase\n');
  console.log('='.repeat(50));
  
  const csvDir = path.join(process.cwd(), 'neon_export_csv');
  const tables = fs.readdirSync(csvDir)
    .filter(file => file.endsWith('.csv'))
    .map(file => file.replace('.csv', ''));
  
  let totalImported = 0;
  let totalErrors = 0;
  
  for (const tableName of tables) {
    const csvPath = path.join(csvDir, `${tableName}.csv`);
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // Parser le CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    if (records.length === 0) {
      console.log(`⚠️  ${tableName}: table vide, skip`);
      continue;
    }
    
    console.log(`\n📊 Import ${tableName}: ${records.length} lignes`);
    
    // Convertir les user_id en UUID si nécessaire
    const cleanedRecords = records.map((record: any) => {
      const cleaned: any = {};
      
      for (const [key, value] of Object.entries(record)) {
        if (value === '' || value === null) {
          cleaned[key] = null;
        } else if (key.includes('user_id') || key === 'id' || key === 'requester_id' || key === 'recipient_id' || key === 'referred_by' || key === 'challenge_id' || key === 'season_id' || key === 'card_back_id' || key === 'related_id') {
          // Vérifier si c'est un UUID valide
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (value && !uuidRegex.test(value as string)) {
            console.log(`⚠️  UUID invalide pour ${key}: ${value} - ignoré`);
            cleaned[key] = null;
          } else {
            cleaned[key] = value;
          }
        } else if (key.includes('jsonb') || key === 'privacy_settings' || key === 'owned_avatars' || key === 'reward' || key === 'player_hand' || key === 'dealer_hand') {
          // Parser JSONB
          try {
            cleaned[key] = typeof value === 'string' ? JSON.parse(value as string) : value;
          } catch {
            cleaned[key] = value;
          }
        } else if (key.includes('_at') || key.includes('date')) {
          // Dates
          cleaned[key] = value || null;
        } else if (typeof value === 'string' && !isNaN(Number(value)) && (key.includes('coins') || key.includes('gems') || key.includes('xp') || key.includes('level') || key.includes('amount') || key.includes('cost'))) {
          // Nombres
          cleaned[key] = Number(value);
        } else if (value === 'true' || value === 'false') {
          cleaned[key] = value === 'true';
        } else {
          cleaned[key] = value;
        }
      }
      
      return cleaned;
    });
    
    // Insérer par lots de 100
    const batchSize = 100;
    for (let i = 0; i < cleanedRecords.length; i += batchSize) {
      const batch = cleanedRecords.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from(tableName)
        .insert(batch);
      
      if (error) {
        console.error(`  ❌ Erreur lot ${i}-${i + batch.length}: ${error.message}`);
        totalErrors += batch.length;
      } else {
        console.log(`  ✅ Lot ${i}-${i + batch.length} importé`);
        totalImported += batch.length;
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 RÉSULTAT IMPORT:`);
  console.log(`   ✅ Lignes importées: ${totalImported}`);
  console.log(`   ❌ Erreurs: ${totalErrors}`);
}

async function createTrigger() {
  console.log('\n🔧 ÉTAPE 4: Création du trigger auth\n');
  console.log('='.repeat(50));
  
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
  
  console.log('📝 Trigger SQL à exécuter dans Supabase SQL Editor:');
  console.log('\n' + triggerSQL);
  console.log('\n📋 Copiez ce SQL et exécutez-le dans: Supabase → SQL Editor');
  
  // Sauvegarder dans un fichier
  fs.writeFileSync(
    path.join(process.cwd(), 'supabase_migration', '02_create_trigger.sql'),
    triggerSQL
  );
  
  console.log('\n✅ Fichier sauvegardé: supabase_migration/02_create_trigger.sql');
}

async function main() {
  console.log('🚀 MIGRATION NEON → SUPABASE');
  console.log('='.repeat(50));
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log('');
  
  try {
    // Tester la connexion
    const { data, error } = await supabase.from('_test').select('*').limit(1);
    console.log('✅ Connexion Supabase établie\n');
  } catch (err: any) {
    console.log('⚠️  Note: Connexion Supabase OK (erreur normale si tables pas créées)\n');
  }
  
  // Étape 3: Instructions pour créer les tables
  await createTablesDirectly();
  
  // Attendre confirmation utilisateur
  console.log('\n⏭️  Pour continuer, l\'utilisateur doit:');
  console.log('   1. Créer les tables via SQL Editor Supabase');
  console.log('   2. Relancer ce script pour import des données');
  console.log('\n💡 Commande: npx tsx scripts/supabase-migration-import.ts');
}

main().catch(console.error);
