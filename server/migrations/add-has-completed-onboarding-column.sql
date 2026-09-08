-- Add the first-run onboarding completion flag to users. Added with DEFAULT TRUE so every
-- existing row is backfilled to "already done" in this same statement (no separate UPDATE
-- pass needed, no window where an existing player would read as a brand-new one) — the next
-- statement then flips the column's default to FALSE so every account created from here on
-- sees the onboarding flow exactly once, the way it's meant to.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users
ALTER COLUMN has_completed_onboarding SET DEFAULT FALSE;
