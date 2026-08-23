-- Play with Friends: the host's seat ("bottom") was always dealt first and so always acted
-- first, every single hand. turn_order stores the shuffled seat order picked fresh each time
-- a hand is dealt (dealTableHand in storage.ts), so who goes first is random instead of
-- always tied to whoever created the table.

ALTER TABLE game_tables ADD COLUMN IF NOT EXISTS turn_order JSONB;
