-- Daily win-streak rewards now require a manual claim (via the streak popup) instead of
-- being auto-credited at settlement time. Defaults to true so existing users don't suddenly
-- show a claimable reward for a win that was already auto-paid under the old system.

ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_reward_claimed BOOLEAN DEFAULT true;
