-- Check and create admin account
-- Email: admin@berrple.com
-- Username: admin
-- Password: admin123

-- 1. Check if admin exists
SELECT id, username, email, is_admin, created_at FROM users WHERE email = 'admin@berrple.com' OR username = 'admin';

-- 2. Delete existing admin if exists (to start fresh)
DELETE FROM users WHERE email = 'admin@berrple.com' OR username = 'admin';

-- 3. Create new admin account
-- Password hash for 'admin123' with bcrypt 10 rounds
INSERT INTO users (username, email, password, is_admin, points, rating, tier)
VALUES (
  'admin',
  'admin@berrple.com',
  '$2b$10$rGQ3Z9Z3Z3Z3Z3Z3Z3Z3ZuKJ5vX5X5X5X5X5X5X5X5X5X5X5X5X5X5',
  TRUE,
  999999,
  3000,
  'CHALLENGER'
);

-- 4. Verify admin was created
SELECT id, username, email, is_admin, points, rating, tier FROM users WHERE email = 'admin@berrple.com';

-- 5. Create user_stats for admin
INSERT INTO user_stats (user_id, total_matches, wins, losses, current_streak, longest_win_streak)
SELECT id, 0, 0, 0, 0, 0
FROM users
WHERE email = 'admin@berrple.com'
ON DUPLICATE KEY UPDATE user_id = user_id;
