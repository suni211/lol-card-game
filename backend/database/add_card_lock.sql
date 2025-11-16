-- Add is_locked column to user_cards table
ALTER TABLE user_cards
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE AFTER level;

-- Verify
SELECT 'user_cards schema after adding is_locked' as info;
DESCRIBE user_cards;
