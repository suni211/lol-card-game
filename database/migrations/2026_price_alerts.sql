-- Additive fix for the transfer market's price-alert / upper-limit reservation list.
-- Preserve all existing listings and prior reservations.
USE lol_card_game;
CREATE TABLE IF NOT EXISTS price_alerts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  player_id INT NOT NULL,
  max_price INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_price_alert_user_player (user_id,player_id),
  KEY idx_alert_player (player_id,is_active,max_price),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
