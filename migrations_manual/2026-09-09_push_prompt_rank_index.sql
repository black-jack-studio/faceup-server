-- In-app notification permission popup: tracks the rank tier index at which it was last shown.
-- Run manually in Supabase before deploying this change.

ALTER TABLE users ADD COLUMN IF NOT EXISTS push_prompt_rank_index INTEGER;
