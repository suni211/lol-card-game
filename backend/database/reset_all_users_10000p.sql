-- Reset all user data and set initial points to 10000
-- WARNING: This will delete ALL user data!

USE lol_card_game;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all user-related data
DELETE FROM user_collected_cards;
DELETE FROM user_collection_progress;
DELETE FROM user_coaches;
DELETE FROM user_gacha_pity;
DELETE FROM gacha_history;
DELETE FROM user_cards;
DELETE FROM user_decks;
DELETE FROM decks;
DELETE FROM user_achievements;
DELETE FROM user_missions;
DELETE FROM ai_battle_history;
DELETE FROM matchmaking_queue;
DELETE FROM user_stats;
DELETE FROM users;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Update default points for new users to 10000
ALTER TABLE users MODIFY COLUMN points INT DEFAULT 10000;

-- Verify deletion
SELECT 'All user data deleted!' as status;
SELECT 'Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'User cards:', COUNT(*) FROM user_cards
UNION ALL
SELECT 'Gacha history:', COUNT(*) FROM gacha_history
UNION ALL
SELECT 'Decks:', COUNT(*) FROM decks
UNION ALL
SELECT 'Achievements:', COUNT(*) FROM user_achievements;

-- Show new default points setting
SELECT 'New user default points is now 10000' as message;
