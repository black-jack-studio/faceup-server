-- Complete removal of the All-in game mode. The mode card stays visible on the home screen
-- (permanently disabled, not clickable) but nothing behind it is played anymore — tickets
-- themselves are kept as a currency (still purchasable in the Shop, earnable via the daily
-- spin and Battle Pass) since there was no plan to reuse them elsewhere yet.
-- Run manually in Supabase before deploying this change.

DROP TABLE IF EXISTS all_in_runs;
DROP TYPE IF EXISTS all_in_result;

ALTER TABLE active_games DROP COLUMN IF EXISTS ticket_consumed;
