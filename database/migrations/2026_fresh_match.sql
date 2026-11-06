-- New 2026-only game launch. Run *after* schema.sql and migrations/2026_live_worlds.sql.
-- Old accounts/cards/records should NOT be copied into the new database.
USE lol_card_game;
CREATE TABLE IF NOT EXISTS rift_match_history (
  id CHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  mode ENUM('AI','PVP') NOT NULL DEFAULT 'AI',
  finished BOOLEAN NOT NULL DEFAULT FALSE,
  winner TINYINT NULL,
  match_data LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rift_history_user (user_id,created_at),
  CONSTRAINT fk_rift_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- schema.sql includes historical 2017/18/19 card migrations. Remove their seeds.
-- Foreign keys pointing at the old cards use ON DELETE CASCADE where configured.
DELETE FROM players WHERE season IS NULL OR season NOT IN ('26 LIVE','26WR','26WRs');
