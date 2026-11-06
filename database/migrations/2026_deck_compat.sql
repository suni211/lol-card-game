-- Non-destructive 2026 deck compatibility migration.
USE lol_card_game;
ALTER TABLE decks
  ADD COLUMN IF NOT EXISTS deck_slot INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS preset_name VARCHAR(100) NULL;
ALTER TABLE user_cards
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Do not rearrange historic decks automatically: any existing duplicate slots
-- can be reviewed by an administrator before assigning unique slot numbers.
-- The saving API supports slots 1-5 once the columns exist.
UPDATE decks SET is_default = TRUE WHERE deck_slot=1 AND is_default=FALSE;

SELECT COUNT(*) AS deck_count FROM decks;
