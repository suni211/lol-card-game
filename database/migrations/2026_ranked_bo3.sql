USE lol_card_game;
CREATE TABLE IF NOT EXISTS ranked_bo3_series (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  deck_id INT NULL,
  mode ENUM('AI','RANKED') NOT NULL DEFAULT 'RANKED',
  roster_json LONGTEXT NULL,
  player_power INT NOT NULL,
  opponent_power INT NOT NULL,
  wins TINYINT NOT NULL DEFAULT 0,
  losses TINYINT NOT NULL DEFAULT 0,
  rounds_json LONGTEXT NOT NULL,
  status ENUM('ACTIVE','WIN','LOSE') NOT NULL DEFAULT 'ACTIVE',
  rating_delta INT NOT NULL DEFAULT 0,
  points_reward INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ranked_bo3_user_status (user_id,status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Compatible with a table created by an earlier version of this migration.
ALTER TABLE ranked_bo3_series
  ADD COLUMN IF NOT EXISTS mode ENUM('AI','RANKED') NOT NULL DEFAULT 'RANKED',
  ADD COLUMN IF NOT EXISTS roster_json LONGTEXT NULL;

// Existing early installs that already created NOT NULL deck_id must be reviewed
// manually before altering a foreign-key column. New installs create it NULL.
