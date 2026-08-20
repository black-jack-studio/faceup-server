-- Daily win-streak: consecutive calendar days (Paris time) with at least one Classic solo
-- win, distinct from current_streak_classic (consecutive wins within a session). Run
-- manually in Supabase before deploying this change.

ALTER TABLE users ADD COLUMN IF NOT EXISTS current_day_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_day_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_streak_win_date TEXT;
