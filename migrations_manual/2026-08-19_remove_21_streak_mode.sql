-- Complete removal of the "21 Streak" game mode (formerly the "high-stakes" mode key).
-- Run manually in Supabase after deploying this change.

DROP TABLE IF EXISTS streak_leaderboard;

ALTER TABLE users DROP COLUMN IF EXISTS max_streak_21;
ALTER TABLE users DROP COLUMN IF EXISTS current_streak_21;
ALTER TABLE users DROP COLUMN IF EXISTS total_streak_wins;
ALTER TABLE users DROP COLUMN IF EXISTS total_streak_earnings;
