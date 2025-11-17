-- Add welcome packs system
-- Gives new users 5 free special packs containing only 25WW, 25WUD, and 19G2 cards

USE lol_card_game;

-- Check if column exists, if not add it
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lol_card_game'
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'welcome_packs_remaining'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE users ADD COLUMN welcome_packs_remaining INT DEFAULT 5 AFTER is_admin',
  'SELECT "Column already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Set 5 welcome packs for all existing users (compensation)
UPDATE users SET welcome_packs_remaining = 5 WHERE welcome_packs_remaining IS NULL OR welcome_packs_remaining = 0;

-- Verify
SELECT id, username, welcome_packs_remaining FROM users LIMIT 10;
