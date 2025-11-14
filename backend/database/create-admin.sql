-- Create admin account
-- Email: admin@berrple.com
-- Username: admin
-- Password: ss092888?
-- Hashed password (bcrypt with 10 rounds)

-- First check if admin already exists
SELECT id, username, email FROM users WHERE email = 'admin@berrple.com' OR username = 'admin';

-- If no results above, run the following INSERT:

INSERT INTO users
(username, email, password, registration_ip, points, tier, rating, is_admin, is_email_verified, created_at)
VALUES
('admin', 'admin@berrple.com', '$2b$10$ELVwQZInaestrgCzsWOfROlUbPpJRuCfZtDR4ZmrCZGBRHhjeLBOO', '127.0.0.1', 0, 'ADMIN', 0, TRUE, TRUE, NOW());

-- Get the admin user ID
SET @admin_id = LAST_INSERT_ID();

-- Create user stats for admin
INSERT INTO user_stats (user_id) VALUES (@admin_id);

-- Verify admin was created
SELECT id, username, email, points, tier, rating, is_admin FROM users WHERE email = 'admin@berrple.com';
