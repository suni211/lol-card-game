-- Compensation: Give 1,000,000 points to all users
-- Apology for 19G2 card loss during tier column removal

USE lol_card_game;

-- Show current state before compensation
SELECT
  COUNT(*) as total_users,
  AVG(points) as avg_points_before,
  MIN(points) as min_points,
  MAX(points) as max_points
FROM users;

-- Give 1,000,000 points to all users
UPDATE users
SET points = points + 1000000;

-- Show state after compensation
SELECT
  COUNT(*) as total_users,
  AVG(points) as avg_points_after,
  MIN(points) as min_points,
  MAX(points) as max_points
FROM users;

-- Show individual user points (first 20 users)
SELECT
  id,
  username,
  points,
  tier,
  rating
FROM users
ORDER BY id
LIMIT 20;
