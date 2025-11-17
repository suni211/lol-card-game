-- Add welcome packs system
-- Gives new users 5 free special packs containing only 25WW, 25WUD, and 19G2 cards

USE lol_card_game;

-- Add welcome_packs_remaining column to users table
ALTER TABLE users ADD COLUMN welcome_packs_remaining INT DEFAULT 5 AFTER is_admin;

-- Set 5 welcome packs for all existing users (compensation)
UPDATE users SET welcome_packs_remaining = 5;

-- Verify
SELECT id, username, welcome_packs_remaining FROM users LIMIT 10;
