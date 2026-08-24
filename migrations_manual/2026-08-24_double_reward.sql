-- Classic solo's "watch an ad to double your win" offer on the end-of-hand result sheet.
-- Tracks whether a completed hand's reward has already been doubled, so the same hand can't
-- be claimed twice.

ALTER TABLE active_games ADD COLUMN IF NOT EXISTS reward_doubled BOOLEAN NOT NULL DEFAULT false;
