-- Premium perk: 2 truly-free daily Lucky Reels spins instead of 1 (PREMIUM_FREE_SPINS_PER_DAY
-- in storage.ts). Tracked the same way as spins_toward_bonus_free_spin -- a count + "last
-- touched" timestamp, treated as 0 once the timestamp ages past the next Paris reset boundary.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS free_spins_used_today INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS free_spins_used_today_updated_at TIMESTAMP;
