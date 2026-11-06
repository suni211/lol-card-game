-- Daily lottery draw guard and required lottery storage; existing records are preserved.
USE lol_card_game;

CREATE TABLE IF NOT EXISTS lottery_boards (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  board_data LONGTEXT NOT NULL,
  picked_numbers LONGTEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lottery_active (user_id,is_active),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lottery_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  board_id BIGINT NOT NULL,
  picked_number INT NOT NULL,
  grade VARCHAR(8) NOT NULL,
  reward_data LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lottery_history (user_id,created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (board_id) REFERENCES lottery_boards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Unique key is the authoritative anti-double-draw guarantee.
CREATE TABLE IF NOT EXISTS lottery_daily_plays (
  user_id INT NOT NULL,
  play_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id,play_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Existing history generated while DB session was using UTC is backfilled in KST.
-- If historical records were stored under a different timezone, inspect before applying.
INSERT IGNORE INTO lottery_daily_plays (user_id,play_date)
SELECT user_id,DATE(CONVERT_TZ(created_at,'+00:00','+09:00'))
FROM lottery_logs;
