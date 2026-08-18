-- Play with Friends — Phase 2 (the actual synchronized hand: independent bets per seat,
-- turn-based play bottom -> left -> right, shared dealer, settlement for every seat).
-- Run manually in Supabase before deploying this change, after
-- 2026-08-18_play_with_friends_tables.sql.

ALTER TABLE game_tables ADD COLUMN IF NOT EXISTS deck JSONB;
ALTER TABLE game_tables ADD COLUMN IF NOT EXISTS deck_seed TEXT;
ALTER TABLE game_tables ADD COLUMN IF NOT EXISTS deck_hash TEXT;
ALTER TABLE game_tables ADD COLUMN IF NOT EXISTS dealer_hand JSONB;
ALTER TABLE game_tables ADD COLUMN IF NOT EXISTS current_turn_user_id UUID REFERENCES users(id);

ALTER TABLE table_seats ADD COLUMN IF NOT EXISTS bet_amount BIGINT;
ALTER TABLE table_seats ADD COLUMN IF NOT EXISTS bet_confirmed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE table_seats ADD COLUMN IF NOT EXISTS hand JSONB;
