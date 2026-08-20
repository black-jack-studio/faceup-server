-- Renames the "tickets" currency to "keys" (icon and copy updated app-wide to match).
-- Run manually in Supabase before deploying this change.

ALTER TABLE users RENAME COLUMN tickets TO keys;
