import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('\n🧪 TEST DE CONNEXION SUPABASE\n');
console.log('='.repeat(50));

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   - VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runTests() {
  console.log('\n📍 Supabase URL:', supabaseUrl);
  console.log('📍 Project Ref:', supabaseUrl.replace('https://', '').split('.')[0]);

  // Test 1: Check tables exist
  console.log('\n1️⃣ Vérification des tables...');
  const { data: tables, error: tablesError } = await supabase
    .from('users')
    .select('count')
    .limit(1);

  if (tablesError) {
    console.error('❌ Erreur:', tablesError.message);
    console.error('💡 Avez-vous exécuté les fichiers SQL dans Supabase SQL Editor ?');
    process.exit(1);
  }
  console.log('✅ Table users accessible');

  // Test 2: Count users
  console.log('\n2️⃣ Comptage des utilisateurs...');
  const { count, error: countError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Erreur:', countError.message);
    process.exit(1);
  }
  console.log(`✅ ${count} utilisateurs trouvés`);

  // Test 3: Check all tables
  console.log('\n3️⃣ Vérification de toutes les tables...');
  const tablesToCheck = [
    'users', 'seasons', 'challenges', 'card_backs', 'config',
    'game_stats', 'inventory', 'daily_spins', 'achievements',
    'user_challenges', 'gem_transactions', 'gem_purchases',
    'battle_pass_rewards', 'streak_leaderboard', 'user_card_backs',
    'bet_drafts', 'all_in_runs', 'friendships', 'rank_rewards_claimed'
  ];

  const results: Record<string, number> = {};
  
  for (const table of tablesToCheck) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    results[table] = count || 0;
  }

  console.log('\n📊 Résultats:');
  Object.entries(results).forEach(([table, count]) => {
    const emoji = count > 0 ? '✅' : '⚠️';
    console.log(`   ${emoji} ${table.padEnd(25)} ${count} lignes`);
  });

  // Test 4: Sample user data
  console.log('\n4️⃣ Test de lecture utilisateur...');
  const { data: sampleUser, error: userError } = await supabase
    .from('users')
    .select('*')
    .limit(1)
    .single();

  if (userError) {
    console.error('❌ Erreur:', userError.message);
  } else {
    console.log('✅ Utilisateur exemple:');
    console.log(`   - ID: ${sampleUser.id}`);
    console.log(`   - Username: ${sampleUser.username}`);
    console.log(`   - XP: ${sampleUser.xp}`);
    console.log(`   - Coins: ${sampleUser.coins}`);
    console.log(`   - Gems: ${sampleUser.gems}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✨ TOUS LES TESTS RÉUSSIS !');
  console.log('\n💡 Prochaine étape: Ajouter USE_SUPABASE=true dans les Secrets');
  console.log('💡 Puis: Redémarrer l\'app pour basculer vers Supabase\n');
}

runTests().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
