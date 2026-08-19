-- Push notifications (direct APNs) — device token storage on users.
-- Run manually in Supabase before deploying this change.

ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_platform TEXT;
