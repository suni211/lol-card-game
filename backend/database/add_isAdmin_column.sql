-- Add isAdmin column to users table
ALTER TABLE users
ADD COLUMN isAdmin BOOLEAN NOT NULL DEFAULT FALSE AFTER email;

-- Set admin for user id 95 (or change this to your user id)
UPDATE users SET isAdmin = TRUE WHERE id = 95;

-- Verify
SELECT id, username, email, isAdmin FROM users WHERE isAdmin = TRUE;
