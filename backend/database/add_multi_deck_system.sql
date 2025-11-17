-- Multi-Deck System
-- Allow users to save multiple decks with custom names

USE lol_card_game;

-- Add deck slot number (1-5) and improve deck naming
-- Users can have up to 5 decks
ALTER TABLE decks ADD COLUMN deck_slot INT DEFAULT 1 AFTER user_id;
ALTER TABLE decks ADD COLUMN is_default BOOLEAN DEFAULT FALSE AFTER is_active;

-- Create unique index: one deck per slot per user
CREATE UNIQUE INDEX idx_user_deck_slot ON decks(user_id, deck_slot);

-- Update existing decks to slot 1
UPDATE decks SET deck_slot = 1 WHERE deck_slot IS NULL;

-- Make deck_slot NOT NULL after updating existing data
ALTER TABLE decks MODIFY COLUMN deck_slot INT NOT NULL;

-- Add deck slot constraint (1-5)
ALTER TABLE decks ADD CONSTRAINT chk_deck_slot CHECK (deck_slot BETWEEN 1 AND 5);
