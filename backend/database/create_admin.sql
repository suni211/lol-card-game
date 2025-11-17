-- Create admin account
-- Username: admin
-- Password: ss092888!
-- Email: admin@berrple.com

USE lol_card_game;

-- Delete existing admin account if exists
DELETE FROM users WHERE email = 'admin@berrple.com';

-- Insert admin account
-- Password hash for "ss092888!" using bcrypt (10 rounds)
INSERT INTO users (
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

-- Create user_stats for admin
INSERT INTO user_stats (user_id) VALUES (LAST_INSERT_ID());

-- Verify admin account creation
SELECT id, username, email, points, tier, rating, is_admin, welcome_packs_remaining FROM users WHERE email = 'admin@berrple.com';
