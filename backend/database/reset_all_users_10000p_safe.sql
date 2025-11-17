-- Reset all user data and set initial points to 10000
-- WARNING: This will delete ALL user data!
-- SAFE VERSION: Won't error if tables don't exist

USE lol_card_game;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all user-related data (using IF EXISTS pattern)
-- Collections
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'user_collected_cards') > 0,
  'DELETE FROM user_collected_cards',
  'SELECT "Table user_collected_cards does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'user_collection_progress') > 0,
  'DELETE FROM user_collection_progress',
  'SELECT "Table user_collection_progress does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Coaches
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'user_coaches') > 0,
  'DELETE FROM user_coaches',
  'SELECT "Table user_coaches does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Gacha
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'user_gacha_pity') > 0,
  'DELETE FROM user_gacha_pity',
  'SELECT "Table user_gacha_pity does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'gacha_history') > 0,
  'DELETE FROM gacha_history',
  'SELECT "Table gacha_history does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Cards
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'user_cards') > 0,
  'DELETE FROM user_cards',
  'SELECT "Table user_cards does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Decks
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'decks') > 0,
  'DELETE FROM decks',
  'SELECT "Table decks does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Achievements & Missions
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'user_achievements') > 0,
  'DELETE FROM user_achievements',
  'SELECT "Table user_achievements does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'user_missions') > 0,
  'DELETE FROM user_missions',
  'SELECT "Table user_missions does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Battle & Matchmaking
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'ai_battle_history') > 0,
  'DELETE FROM ai_battle_history',
  'SELECT "Table ai_battle_history does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'matchmaking_queue') > 0,
  'DELETE FROM matchmaking_queue',
  'SELECT "Table matchmaking_queue does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Guild
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'guild_members') > 0,
  'DELETE FROM guild_members',
  'SELECT "Table guild_members does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Referrals
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'referrals') > 0,
  'DELETE FROM referrals',
  'SELECT "Table referrals does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Level & Coupons
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'user_level_rewards') > 0,
  'DELETE FROM user_level_rewards',
  'SELECT "Table user_level_rewards does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'coupon_usage') > 0,
  'DELETE FROM coupon_usage',
  'SELECT "Table coupon_usage does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Stats
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'user_stats') > 0,
  'DELETE FROM user_stats',
  'SELECT "Table user_stats does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Finally, users
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lol_card_game' AND table_name = 'users') > 0,
  'DELETE FROM users',
  'SELECT "Table users does not exist"'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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
