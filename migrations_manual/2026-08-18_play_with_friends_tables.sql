-- Play with Friends — Phase 1 (lobby: create/join a table, invite friends, live seats).
-- Run manually in Supabase before deploying this change (same workflow as active_games and
-- the email-verification/password-reset migrations earlier).

-- users.id is a real `uuid` column in Supabase even though shared/schema.ts declares it as
-- `varchar` (Drizzle's JS-side type doesn't need to match the physical column type — the
-- postgres driver passes UUID values through as plain strings either way) — every FK-
-- referencing column below must be UUID too, or Postgres refuses to create the constraint.
CREATE TABLE IF NOT EXISTS game_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL REFERENCES users(id),
  mode TEXT NOT NULL DEFAULT 'classic',
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS table_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES game_tables(id),
  user_id UUID NOT NULL REFERENCES users(id),
  position TEXT NOT NULL,
  joined_at TIMESTAMP DEFAULT now(),
  UNIQUE (table_id, position),
  UNIQUE (table_id, user_id)
);

CREATE TABLE IF NOT EXISTS table_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES game_tables(id),
  inviter_user_id UUID NOT NULL REFERENCES users(id),
  invitee_user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (table_id, invitee_user_id)
);
