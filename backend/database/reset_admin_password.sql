-- Reset admin password
-- Email: admin@berrple.com
-- Username: admin
-- Password: ss092888?
-- This is the bcrypt hash of 'ss092888?' with 10 rounds

-- Check if admin exists
SELECT id, username, email, is_admin FROM users WHERE email = 'admin@berrple.com' OR username = 'admin';

-- Update admin password (bcrypt hash of 'ss092888?')
UPDATE users
SET
  password = '$2b$10$ELVwQZInaestrgCzsWOfROlUbPpJRuCfZtDR4ZmrCZGBRHhjeLBOO',
  is_admin = TRUE,
  is_email_verified = TRUE
WHERE email = 'admin@berrple.com' OR username = 'admin';

-- Verify update
SELECT id, username, email, is_admin, is_email_verified FROM users WHERE email = 'admin@berrple.com' OR username = 'admin';
