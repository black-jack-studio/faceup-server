-- In-app ATT (App Tracking Transparency) pre-permission popup: tracks whether it's already
-- been shown/answered once. Run manually in Supabase before deploying this change.

ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_tracking_prompt BOOLEAN NOT NULL DEFAULT false;
