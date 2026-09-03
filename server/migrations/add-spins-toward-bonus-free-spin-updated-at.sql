-- Track when spinsTowardBonusFreeSpin was last incremented, so a count left unfinished at the
-- end of one day doesn't carry over into the next (it should reset to 0, not accumulate).
ALTER TABLE users
ADD COLUMN IF NOT EXISTS spins_toward_bonus_free_spin_updated_at TIMESTAMP;
