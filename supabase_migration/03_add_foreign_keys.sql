
-- ============================================
-- FOREIGN KEYS ET CONTRAINTES
-- ============================================
-- Ajouter les foreign keys après l'import des données
-- Note: Enlève les contraintes si elles existent déjà pour éviter les erreurs

-- Game Stats
DO $$ BEGIN
  ALTER TABLE public.game_stats ADD CONSTRAINT fk_game_stats_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Inventory
DO $$ BEGIN
  ALTER TABLE public.inventory ADD CONSTRAINT fk_inventory_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Daily Spins
DO $$ BEGIN
  ALTER TABLE public.daily_spins ADD CONSTRAINT fk_daily_spins_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Achievements
DO $$ BEGIN
  ALTER TABLE public.achievements ADD CONSTRAINT fk_achievements_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User Challenges
DO $$ BEGIN
  ALTER TABLE public.user_challenges ADD CONSTRAINT fk_user_challenges_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.user_challenges ADD CONSTRAINT fk_user_challenges_challenge 
    FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Battle Pass Rewards
DO $$ BEGIN
  ALTER TABLE public.battle_pass_rewards ADD CONSTRAINT fk_battle_pass_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.battle_pass_rewards ADD CONSTRAINT fk_battle_pass_season 
    FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Gem Transactions
DO $$ BEGIN
  ALTER TABLE public.gem_transactions ADD CONSTRAINT fk_gem_transactions_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Gem Purchases
DO $$ BEGIN
  ALTER TABLE public.gem_purchases ADD CONSTRAINT fk_gem_purchases_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Streak Leaderboard
DO $$ BEGIN
  ALTER TABLE public.streak_leaderboard ADD CONSTRAINT fk_streak_leaderboard_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User Card Backs
DO $$ BEGIN
  ALTER TABLE public.user_card_backs ADD CONSTRAINT fk_user_card_backs_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.user_card_backs ADD CONSTRAINT fk_user_card_backs_card 
    FOREIGN KEY (card_back_id) REFERENCES public.card_backs(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Bet Drafts
DO $$ BEGIN
  ALTER TABLE public.bet_drafts ADD CONSTRAINT fk_bet_drafts_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- All-in Runs
DO $$ BEGIN
  ALTER TABLE public.all_in_runs ADD CONSTRAINT fk_all_in_runs_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Friendships
DO $$ BEGIN
  ALTER TABLE public.friendships ADD CONSTRAINT fk_friendships_requester 
    FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.friendships ADD CONSTRAINT fk_friendships_recipient 
    FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rank Rewards Claimed
DO $$ BEGIN
  ALTER TABLE public.rank_rewards_claimed ADD CONSTRAINT fk_rank_rewards_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
