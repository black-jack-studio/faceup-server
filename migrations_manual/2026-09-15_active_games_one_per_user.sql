-- A double-tap on "Play", or a retry after a flaky network response, could send /api/game/start
-- twice before the first request's row had committed. Nothing stopped two 'in_progress' rows
-- from being created for the same user: both bets got debited, but getActiveGameForUser()
-- (LIMIT 1, no ORDER BY) only ever surfaces one of them -- the other sits there forever, its bet
-- gone with no game to play and no refund (2026-09-15 economy audit).
--
-- This makes a second concurrent attempt fail outright at the database level instead of quietly
-- creating a duplicate -- server/routes.ts's /api/game/start now catches that failure and
-- returns the user's existing in-progress game instead of erroring.
--
-- Safe to run even if a duplicate already exists for some user right now: this index creation
-- will fail with a "could not create unique index" error naming the conflicting rows rather than
-- silently succeeding, so any existing duplicates surface immediately instead of after the fact.
-- If it fails, resolve those users' extra rows manually (refund + close/delete the duplicate)
-- before re-running.
CREATE UNIQUE INDEX IF NOT EXISTS active_games_one_in_progress_per_user
  ON active_games (user_id)
  WHERE status = 'in_progress';
