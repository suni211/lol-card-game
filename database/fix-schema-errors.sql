-- Fix for schema.sql errors
-- Run this after the main schema.sql has been run

USE lol_card_game;

-- 1. Add missing columns to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS tier ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'ICON', 'GR') DEFAULT 'COMMON' AFTER region;

-- 2. Add missing columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE AFTER consecutive_days,
ADD COLUMN IF NOT EXISTS level INT DEFAULT 1 AFTER referral_code,
ADD COLUMN IF NOT EXISTS exp INT DEFAULT 0 AFTER level,
ADD COLUMN IF NOT EXISTS welcome_packs_remaining INT DEFAULT 5 AFTER exp;

-- 3. Add missing columns to missions table
ALTER TABLE missions
ADD COLUMN IF NOT EXISTS mission_type VARCHAR(50) AFTER type;

-- 4. Add missing salary column to players (if needed for WCP players)
ALTER TABLE players
ADD COLUMN IF NOT EXISTS salary INT DEFAULT 0 AFTER market_value;

-- 5. Create admin user (if doesn't exist)
INSERT IGNORE INTO users (
  username,
  email,
  password,
  points,
  tier,
  rating,
  is_admin,
  level,
  exp,
  welcome_packs_remaining,
  referral_code
) VALUES (
  'admin',
  'admin@berrple.com',
  '$2b$10$ANYm4AbavfvAGPJL8qmUnusCeS/JnVid7Fzzp0bU4o6q8L18FXtZK',
  0,
  'CHALLENGER',
  2000,
  1,
  1,
  0,
  5,
  'ADMIN001'
);

-- 6. Add user_stats for admin if needed
INSERT IGNORE INTO user_stats (user_id)
SELECT id FROM users WHERE username = 'admin';

SELECT 'Schema fixes applied successfully!' as status;
