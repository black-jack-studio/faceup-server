-- ============================================
-- MIGRATION SUPABASE - ÉTAPE 3
-- Création des tables (SANS FK)
-- ============================================
-- Date: 2 octobre 2025
-- Source: Neon database
-- Destination: Supabase
-- 
-- IMPORTANT: Ce script crée les tables SANS foreign keys
-- Les FK seront ajoutées après l'import des données (étape 6)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TABLE PRINCIPALE: users (devient profiles dans Supabase)
-- ============================================
-- Note: Dans Supabase, on utilisera public.profiles liée à auth.users
-- Pour l'instant on crée "users" temporairement pour l'import
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
  referred_by uuid,  -- Convertir en UUID
  referral_count integer DEFAULT 0,
  referral_reward_claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. GAME STATS
-- ============================================
CREATE TABLE IF NOT EXISTS public.game_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,  -- FK sera ajoutée plus tard
  game_type text NOT NULL,
  hands_played integer DEFAULT 0,
  hands_won integer DEFAULT 0,
  hands_lost integer DEFAULT 0,
  hands_pushed integer DEFAULT 0,
  total_winnings bigint DEFAULT 0,
  total_losses bigint DEFAULT 0,
  blackjacks integer DEFAULT 0,
  busts integer DEFAULT 0,
  correct_decisions integer DEFAULT 0,
  total_decisions integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 3. INVENTORY
-- ============================================
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  item_id text NOT NULL,
  acquired_at timestamptz DEFAULT now()
);

-- ============================================
-- 4. DAILY SPINS
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  last_spin_at timestamptz DEFAULT now(),
  reward jsonb
);

-- ============================================
-- 5. ACHIEVEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id text NOT NULL,
  unlocked_at timestamptz DEFAULT now()
);

-- ============================================
-- 6. CHALLENGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  target_value integer NOT NULL,
  reward bigint NOT NULL,
  difficulty text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- ============================================
-- 7. USER CHALLENGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,  -- Déjà UUID dans Neon ✅
  challenge_id uuid NOT NULL,
  current_progress integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  reward_claimed boolean DEFAULT false,
  started_at timestamptz DEFAULT now()
);

-- ============================================
-- 8. SEASONS (Battle Pass)
-- ============================================
CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  max_xp integer DEFAULT 500,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 9. BATTLE PASS REWARDS
-- ============================================
CREATE TABLE IF NOT EXISTS public.battle_pass_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  season_id uuid NOT NULL,
  tier integer NOT NULL,
  is_premium boolean DEFAULT false,
  reward_type text NOT NULL,
  reward_amount bigint NOT NULL,
  claimed_at timestamptz DEFAULT now()
);

-- ============================================
-- 10. GEM TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.gem_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_type text NOT NULL,
  amount bigint NOT NULL,
  description text NOT NULL,
  related_id uuid,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 11. GEM PURCHASES
-- ============================================
CREATE TABLE IF NOT EXISTS public.gem_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  item_id text NOT NULL,
  gem_cost bigint NOT NULL,
  purchased_at timestamptz DEFAULT now()
);

-- ============================================
-- 12. STREAK LEADERBOARD
-- ============================================
CREATE TABLE IF NOT EXISTS public.streak_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start_date timestamptz NOT NULL,
  best_streak integer NOT NULL,
  total_streak_games integer DEFAULT 0,
  total_streak_earnings bigint DEFAULT 0,
  rank integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 13. CARD BACKS
-- ============================================
-- Create ENUM for rarity
DO $$ BEGIN
  CREATE TYPE card_back_rarity AS ENUM ('COMMON', 'RARE', 'SUPER_RARE', 'LEGENDARY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.card_backs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rarity card_back_rarity NOT NULL,
  price_gems bigint NOT NULL,
  image_url text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 14. USER CARD BACKS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_card_backs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_back_id uuid NOT NULL,
  source text NOT NULL,
  acquired_at timestamptz DEFAULT now(),
  UNIQUE(user_id, card_back_id)
);

-- ============================================
-- 15. BET DRAFTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.bet_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  amount bigint NOT NULL,
  mode text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- ============================================
-- 16. ALL-IN RUNS
-- ============================================
-- Create ENUM for result
DO $$ BEGIN
  CREATE TYPE all_in_result AS ENUM ('WIN', 'LOSE', 'PUSH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.all_in_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pre_balance bigint NOT NULL,
  bet_amount bigint NOT NULL,
  result all_in_result NOT NULL,
  multiplier integer NOT NULL,
  payout bigint NOT NULL,
  rebate bigint NOT NULL,
  game_id text NOT NULL UNIQUE,
  game_hash text NOT NULL UNIQUE,
  deck_seed text NOT NULL,
  deck_hash text NOT NULL,
  player_hand jsonb,
  dealer_hand jsonb,
  is_blackjack boolean NOT NULL DEFAULT false,
  player_total integer,
  dealer_total integer,
  ticket_consumed boolean NOT NULL DEFAULT true,
  client_ip text,
  user_agent text,
  session_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, game_id)
);

-- ============================================
-- 17. CONFIG
-- ============================================
CREATE TABLE IF NOT EXISTS public.config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 18. FRIENDSHIPS
-- ============================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, recipient_id),
  CHECK(requester_id != recipient_id)
);

-- ============================================
-- 19. RANK REWARDS CLAIMED
-- ============================================
CREATE TABLE IF NOT EXISTS public.rank_rewards_claimed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rank_key text NOT NULL,
  gems_awarded integer NOT NULL,
  claimed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, rank_key)
);

-- ============================================
-- INDEXES (Performance) - Sans FK
-- ============================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);

-- Game Stats
CREATE INDEX IF NOT EXISTS idx_game_stats_user_id ON public.game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_game_type ON public.game_stats(game_type);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.inventory(user_id);

-- Daily Spins
CREATE INDEX IF NOT EXISTS idx_daily_spins_user_id ON public.daily_spins(user_id);

-- Achievements
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);

-- User Challenges
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON public.user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge_id ON public.user_challenges(challenge_id);

-- Battle Pass Rewards
CREATE INDEX IF NOT EXISTS idx_battle_pass_rewards_user_id ON public.battle_pass_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_battle_pass_rewards_season_id ON public.battle_pass_rewards(season_id);

-- Gem Transactions
CREATE INDEX IF NOT EXISTS idx_gem_transactions_user_id ON public.gem_transactions(user_id);

-- Gem Purchases
CREATE INDEX IF NOT EXISTS idx_gem_purchases_user_id ON public.gem_purchases(user_id);

-- Streak Leaderboard
CREATE INDEX IF NOT EXISTS idx_streak_leaderboard_user_id ON public.streak_leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_leaderboard_week_start ON public.streak_leaderboard(week_start_date);

-- User Card Backs
CREATE INDEX IF NOT EXISTS idx_user_card_backs_user_id ON public.user_card_backs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_card_backs_card_back_id ON public.user_card_backs(card_back_id);

-- Bet Drafts
CREATE INDEX IF NOT EXISTS idx_bet_drafts_user_id ON public.bet_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_bet_drafts_bet_id ON public.bet_drafts(bet_id);

-- All-in Runs
CREATE INDEX IF NOT EXISTS idx_all_in_runs_user_id ON public.all_in_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_all_in_runs_game_id ON public.all_in_runs(game_id);
CREATE INDEX IF NOT EXISTS idx_all_in_runs_game_hash ON public.all_in_runs(game_hash);

-- Friendships
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_recipient_id ON public.friendships(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- Rank Rewards
CREATE INDEX IF NOT EXISTS idx_rank_rewards_claimed_user_id ON public.rank_rewards_claimed(user_id);

-- ============================================
-- RLS (Row Level Security) - SEULEMENT SUR PROFILES
-- ============================================

-- Activer RLS sur la table users (qui deviendra profiles)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- Policy: Les utilisateurs peuvent modifier leur propre profil
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (id = auth.uid());

-- Policy: Permettre la lecture des profils publics (pour recherche amis, classements)
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.users
  FOR SELECT
  USING (
    (privacy_settings->>'profileVisibility')::text = 'public'
    OR id = auth.uid()
  );

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Les foreign keys seront ajoutées à l'étape 6 après l'import
-- 2. La table "users" sera renommée en "profiles" après migration complète
-- 3. Les données seront liées à auth.users via user_id = auth.uid()
-- 4. Toutes les colonnes user_id sont maintenant en UUID
-- 5. Les indexes sont créés pour la performance
-- 6. RLS activé uniquement sur users/profiles pour l'instant

-- ============================================
-- FIN DU SCRIPT
-- ============================================
