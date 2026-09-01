-- New accounts (and the Battle Pass season reset) should start at level 0, not 1,
-- so tier 1 unlocks only after earning a first level instead of being unlocked on creation.
ALTER TABLE users
ALTER COLUMN level SET DEFAULT 0;
