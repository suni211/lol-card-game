-- Reset all user data (Delete all users and related data)
-- WARNING: This will delete ALL user data including admin accounts!

USE lol_card_game;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all user-related data (only core tables that definitely exist)
DELETE FROM user_cards;
DELETE FROM gacha_history;
DELETE FROM decks;
DELETE FROM trades;
DELETE FROM market_listings;
DELETE FROM users;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify deletion
SELECT 'Users deleted:' as status, COUNT(*) as count FROM users;
SELECT 'User cards deleted:' as status, COUNT(*) as count FROM user_cards;
SELECT 'Gacha history deleted:' as status, COUNT(*) as count FROM gacha_history;
SELECT 'Decks deleted:' as status, COUNT(*) as count FROM decks;
SELECT 'Battles deleted:' as status, COUNT(*) as count FROM battles;

-- Optional: Create new admin account
-- Uncomment if you want to create a fresh admin account after reset
-- INSERT INTO users (username, password, points, tier, rating, is_admin, level, exp, welcome_packs_remaining)
-- VALUES ('admin', '$2b$10$YourHashedPasswordHere', 1000000, 'BRONZE', 1000, 1, 1, 0, 5);

-- Note: All new users created after this reset will automatically get 5 welcome packs
-- via the registration system (auth.ts sets welcome_packs_remaining = 5)
