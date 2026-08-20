-- Renames the "keys" currency to "bolts" (icon is a lightning bolt, name now matches).
-- Run manually in Supabase before deploying this change.

ALTER TABLE users RENAME COLUMN keys TO bolts;
