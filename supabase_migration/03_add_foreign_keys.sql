
-- ============================================
-- FOREIGN KEYS ET CONTRAINTES
-- ============================================
-- Ajouter les foreign keys après l'import des données

-- Game Stats
ALTER TABLE IF EXISTS public.game_stats 
  ADD CONSTRAINT IF NOT EXISTS fk_game_stats_user 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Inventory
ALTER TABLE IF EXISTS public.inventory 
  ADD CONSTRAINT IF NOT EXISTS fk_inventory_user 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Daily Spins
ALTER TABLE IF EXISTS public.daily_spins 
  ADD CONSTRAINT IF NOT EXISTS fk_daily_spins_user 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Achievements
ALTER TABLE IF EXISTS public.achievements 
  ADD CONSTRAINT IF NOT EXISTS fk_achievements_user 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- User Challenges
ALTER TABLE IF EXISTS public.user_challenges 
  ADD CONSTRAINT IF NOT EXISTS fk_user_challenges_user 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.user_challenges 
  ADD CONSTRAINT IF NOT EXISTS fk_user_challenges_challenge 
  FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;

-- Battle Pass Rewards
ALTER TABLE IF EXISTS public.battle_pass_rewards 
  ADD CONSTRAINT IF NOT EXISTS fk_battle_pass_user 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.battle_pass_rewards 
  ADD CONSTRAINT IF NOT EXISTS fk_battle_pass_season 
  FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;

-- Gem Transactions
ALTER TABLE IF EXISTS public.gem_transactions 
  ADD CONSTRAINT IF NOT EXISTS fk_gem_transactions_user 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Gem Purchases
ALTER TABLE IF EXISTS public.gem_purchases 
  ADD CONSTRAINT IF NOT EXISTS fk_gem_purchases_user 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Streak Leaderboard
ALTER TABLE IF EXISTS public.streak_leaderboard 
  ADD CONSTRAINT IF NOT EXISTS fk_streak_leaderboard_user 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- User Card Backs
ALTER TABLE IF EXISTS public.user_card_backs 
  ADD CONSTRAINT IF NOT EXISTS fk_user_card_backs_user 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.user_card_backs 
  ADD CONSTRAINT IF NOT EXISTS fk_user_card_backs_card 
  FOREIGN KEY (card_back_id) REFERENCES public.card_backs(id) ON DELETE CASCADE;

-- Bet Drafts
ALTER TABLE IF EXISTS public.bet_drafts 
  ADD CONSTRAINT IF NOT EXISTS fk_bet_drafts_user 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- All-in Runs
ALTER TABLE IF EXISTS public.all_in_runs 
  ADD CONSTRAINT IF NOT EXISTS fk_all_in_runs_user 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Friendships
ALTER TABLE IF EXISTS public.friendships 
  ADD CONSTRAINT IF NOT EXISTS fk_friendships_requester 
  FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.friendships 
  ADD CONSTRAINT IF NOT EXISTS fk_friendships_recipient 
  FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Rank Rewards
ALTER TABLE IF EXISTS public.rank_rewards_claimed 
  ADD CONSTRAINT IF NOT EXISTS fk_rank_rewards_user 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Users (referred_by)
ALTER TABLE IF EXISTS public.users 
  ADD CONSTRAINT IF NOT EXISTS fk_users_referred_by 
  FOREIGN KEY (referred_by) REFERENCES public.users(id) ON DELETE SET NULL;
