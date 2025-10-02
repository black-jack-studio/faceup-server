import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Clés Supabase manquantes !');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n🚀 IMPORT SIMPLE VERS SUPABASE');
console.log('='.repeat(60));
console.log(`📡 URL: ${SUPABASE_URL}\n`);

async function importData() {
  try {
    console.log('📋 Exécution des fichiers SQL via Supabase REST API...\n');

    const sqlFiles = [
      '01_create_tables.sql',
      '04_import_data.sql',
      '02_create_trigger.sql',
      '03_add_foreign_keys.sql'
    ];

    for (const file of sqlFiles) {
      const filePath = path.join(__dirname, '..', 'supabase_migration', file);
      
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Fichier manquant: ${file}`);
        continue;
      }

      console.log(`📄 Lecture: ${file}...`);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      // Pour l'import de données, utiliser la REST API Supabase
      if (file === '04_import_data.sql') {
        console.log(`   ℹ️  Ce fichier contient ${sqlContent.split('INSERT').length - 1} INSERT statements`);
        console.log(`   ⚠️  Taille: ${(sqlContent.length / 1024).toFixed(0)}KB`);
        console.log(`   💡 Vous devez exécuter ce fichier MANUELLEMENT dans Supabase SQL Editor`);
        console.log(`   📍 Supabase Dashboard > SQL Editor > Nouveau query > Coller le contenu\n`);
        continue;
      }

      // Pour les autres fichiers, tenter via RPC
      console.log(`   ✅ ${file} doit être exécuté manuellement dans Supabase SQL Editor\n`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📝 INSTRUCTIONS MANUELLES REQUISES');
    console.log('='.repeat(60));
    console.log('\n1. Ouvrez Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Sélectionnez votre projet');
    console.log('3. Allez dans "SQL Editor"');
    console.log('4. Créez une nouvelle query');
    console.log('5. Exécutez les fichiers dans cet ordre:\n');
    console.log('   ✅ supabase_migration/01_create_tables.sql (créer les tables)');
    console.log('   ✅ supabase_migration/04_import_data.sql (importer les données)');
    console.log('   ✅ supabase_migration/02_create_trigger.sql (créer le trigger)');
    console.log('   ✅ supabase_migration/03_add_foreign_keys.sql (ajouter les FK)');
    console.log('\n6. Une fois terminé, ajouter dans Secrets: USE_SUPABASE=true');
    console.log('7. Redémarrer l\'app\n');

    console.log('💡 Alternative rapide: Utiliser l\'app Supabase qui existe déjà !');
    console.log('   Vos données sont peut-être déjà dans Supabase via le dashboard.\n');

  } catch (error: any) {
    console.error('\n❌ ERREUR:', error.message);
  }
}

importData();
