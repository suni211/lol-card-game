-- Player favorites per user, class/season and enhancement grade.
-- No existing favorites, bids, or player data is modified.
USE lol_card_game;
CREATE TABLE IF NOT EXISTS market_favorites (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  player_id INT NOT NULL,
  enhancement_level TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_market_favorite (user_id,player_id,enhancement_level),
  INDEX idx_market_favorite_player (player_id,enhancement_level),
  CONSTRAINT fk_market_favorite_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_market_favorite_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE market_transactions
  ADD COLUMN IF NOT EXISTS enhancement_level TINYINT UNSIGNED NULL;
-- For still-active offers, the card's current enhancement level is authoritative.
-- Do not guess historical grades on already sold cards.
UPDATE market_transactions mt
JOIN user_cards uc ON uc.id=mt.card_id
SET mt.enhancement_level=uc.level
WHERE mt.status='LISTED' AND mt.enhancement_level IS NULL;
CREATE INDEX IF NOT EXISTS idx_market_transactions_grade ON market_transactions (player_id,status,enhancement_level,sold_at);
