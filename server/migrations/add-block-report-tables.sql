-- Apple App Store Guideline 1.2 (UGC moderation): lets a player block or report another
-- player. Directional block, checked both ways at read time (see storage.ts) so blocked users
-- disappear from each other's friend search and leaderboards regardless of who blocked whom.
-- uuid, not varchar, to match users.id's actual column type in the DB (schema.ts declares it
-- varchar — same pre-existing mismatch friendships.requester_id/recipient_id already has;
-- Drizzle/postgres.js bind JS strings to uuid columns fine, this only matters for the FK DDL).
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES users(id),
  blocked_id uuid NOT NULL REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK(blocker_id != blocked_id)
);

-- No admin panel yet — a report is just an insert here, reviewed directly in the DB for now.
CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id),
  reported_id uuid NOT NULL REFERENCES users(id),
  reason text NOT NULL,
  created_at timestamp DEFAULT now(),
  CHECK(reporter_id != reported_id)
);
