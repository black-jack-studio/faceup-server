import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as fs from 'fs';
import * as path from 'path';

// Configure WebSocket pour Neon
neonConfig.webSocketConstructor = ws;

const dbConfig = {
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
};

if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
  throw new Error("Database configuration incomplete");
}

const pool = new Pool(dbConfig);

// Liste des tables à exporter
const tables = [
  'users',
  'game_stats',
  'inventory',
  'daily_spins',
  'achievements',
  'challenges',
  'user_challenges',
  'seasons',
  'battle_pass_rewards',
  'gem_transactions',
  'gem_purchases',
  'streak_leaderboard',
  'card_backs',
  'user_card_backs',
  'bet_drafts',
  'all_in_runs',
  'config',
  'friendships',
  'rank_rewards_claimed'
];

function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  let str = String(value);
  
  // Si la valeur contient des virgules, guillemets ou sauts de ligne, on l'entoure de guillemets
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Échapper les guillemets en les doublant
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  
  return str;
}

async function exportTableToCSV(tableName: string): Promise<void> {
  try {
    console.log(`📊 Exporting ${tableName}...`);
    
    // Vérifier si la table a une colonne created_at, acquired_at, started_at, ou claimed_at
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name IN ('created_at', 'acquired_at', 'started_at', 'claimed_at', 'last_spin_at', 'unlocked_at', 'purchased_at')
      ORDER BY CASE column_name
        WHEN 'created_at' THEN 1
        WHEN 'acquired_at' THEN 2
        WHEN 'started_at' THEN 3
        WHEN 'claimed_at' THEN 4
        WHEN 'last_spin_at' THEN 5
        WHEN 'unlocked_at' THEN 6
        WHEN 'purchased_at' THEN 7
      END
      LIMIT 1
    `, [tableName]);
    
    const orderByColumn = columnsCheck.rows.length > 0 ? columnsCheck.rows[0].column_name : null;
    const orderBy = orderByColumn ? `ORDER BY ${orderByColumn}` : '';
    
    // Récupérer toutes les données
    const result = await pool.query(`SELECT * FROM ${tableName} ${orderBy}`);
    
    if (result.rows.length === 0) {
      console.log(`⚠️  ${tableName}: 0 rows (table vide)`);
      // Créer quand même un fichier avec juste le header
      const columnsResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tableName]);
      
      const columns = columnsResult.rows.map(r => r.column_name);
      const header = columns.join(',');
      
      const outputDir = path.join(process.cwd(), 'neon_export_csv');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filePath = path.join(outputDir, `${tableName}.csv`);
      fs.writeFileSync(filePath, header + '\n', 'utf8');
      
      console.log(`✅ ${tableName}.csv créé (vide, seulement header)`);
      return;
    }
    
    // Obtenir les noms de colonnes
    const columns = Object.keys(result.rows[0]);
    
    // Créer le header
    const header = columns.join(',');
    
    // Créer les lignes de données
    const rows = result.rows.map(row => {
      return columns.map(col => escapeCSV(row[col])).join(',');
    });
    
    // Combiner header et rows
    const csvContent = [header, ...rows].join('\n');
    
    // Écrire dans le fichier
    const outputDir = path.join(process.cwd(), 'neon_export_csv');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filePath = path.join(outputDir, `${tableName}.csv`);
    fs.writeFileSync(filePath, csvContent, 'utf8');
    
    console.log(`✅ ${tableName}.csv: ${result.rows.length} rows, ${columns.length} columns`);
    console.log(`   Colonnes: ${columns.join(', ')}`);
    
  } catch (error: any) {
    console.error(`❌ Erreur lors de l'export de ${tableName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Démarrage de l\'export Neon → CSV\n');
  console.log(`📍 Base de données: ${dbConfig.database}@${dbConfig.host}\n`);
  
  for (const table of tables) {
    await exportTableToCSV(table);
  }
  
  console.log('\n✨ Export terminé! Fichiers dans: neon_export_csv/');
  
  await pool.end();
}

main().catch(console.error);
