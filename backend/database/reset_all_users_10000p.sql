-- Reset all user data and set initial points to 10000
-- WARNING: This will delete ALL user data!

USE lol_card_game;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all user-related data (only if tables exist)
DELETE FROM user_collected_cards WHERE 1=1;
DELETE FROM user_collection_progress WHERE 1=1;
DELETE FROM user_coaches WHERE 1=1;
DELETE FROM user_gacha_pity WHERE 1=1;
DELETE FROM gacha_history WHERE 1=1;
DELETE FROM user_cards WHERE 1=1;
DELETE FROM decks WHERE 1=1;
DELETE FROM user_achievements WHERE 1=1;
DELETE FROM user_missions WHERE 1=1;
DELETE FROM ai_battle_history WHERE 1=1;
DELETE FROM matchmaking_queue WHERE 1=1;
DELETE FROM user_stats WHERE 1=1;
DELETE FROM guild_members WHERE 1=1;
DELETE FROM referrals WHERE 1=1;
DELETE FROM user_level_rewards WHERE 1=1;
DELETE FROM coupon_usage WHERE 1=1;
DELETE FROM users WHERE 1=1;

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
