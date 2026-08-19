-- Classic Mode weekly win-streak leaderboard — open to every player (Classic has no premium
-- gate). Run manually in Supabase before deploying this change.

ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak_classic INTEGER DEFAULT 0;

-- users.id is a real `uuid` column in Supabase even though shared/schema.ts declares it as
-- `varchar` — the FK-referencing column below must be UUID too (same note as the Play with
-- Friends migration).
CREATE TABLE IF NOT EXISTS classic_streak_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  week_start_date TIMESTAMP NOT NULL,
  best_streak INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE (user_id, week_start_date)
);
