-- Play with Friends — join-by-code (in addition to the friends-list invite flow). Run
-- manually in Supabase after 2026-08-18_play_with_friends_tables.sql and
-- 2026-08-18b_play_with_friends_hand_columns.sql.

ALTER TABLE game_tables ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;
