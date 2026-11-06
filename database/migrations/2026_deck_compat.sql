-- Non-destructive 2026 deck compatibility migration.
USE lol_card_game;
ALTER TABLE decks
  ADD COLUMN IF NOT EXISTS deck_slot INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS preset_name VARCHAR(100) NULL;
ALTER TABLE user_cards
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Preserve a user's existing primary deck as slot 1; assign additional legacy decks
-- to available slots rather than deleting them.
UPDATE decks d
JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY is_active DESC,id ASC) AS rn
  FROM decks
) ordered ON ordered.id=d.id
SET d.deck_slot=ordered.rn
WHERE d.deck_slot=1 AND ordered.rn > 1;

UPDATE decks SET is_default = (deck_slot=1) WHERE is_default=FALSE;

SELECT COUNT(*) AS deck_count FROM decks;
