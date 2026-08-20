-- Online/offline dot on the friends list — last_active_at touched (throttled) by requireAuth
-- on any authenticated request.
-- Run manually in Supabase before deploying this change.

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;
