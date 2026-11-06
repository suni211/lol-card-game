-- Apply once to existing installations before enabling Google sign-in.
USE lol_card_game;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255) NULL;
-- MySQL/MariaDB permits multiple NULL values in a unique index.
SET @has_google_index = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema=DATABASE() AND table_name='users' AND index_name='uq_users_google_sub'
);
SET @add_google_index = IF(@has_google_index=0,
  'CREATE UNIQUE INDEX uq_users_google_sub ON users(google_sub)', 'SELECT 1');
PREPARE google_stmt FROM @add_google_index;
EXECUTE google_stmt;
DEALLOCATE PREPARE google_stmt;
