-- Run AFTER database/schema.sql. Keeps existing cards/match history unchanged.
USE lol_card_game;
CREATE TABLE IF NOT EXISTS rift_games (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  mode ENUM('AI','PVP') NOT NULL,
  status ENUM('WAITING','DRAFT','QUEUED','RUNNING','FINISHED','FAILED') NOT NULL,
  owner_id INT NOT NULL,
  opponent_id INT DEFAULT NULL,
  owner_deck_slot INT NOT NULL,
  opponent_deck_slot INT DEFAULT NULL,
  actions_json JSON NOT NULL,
  strategies_json JSON NOT NULL,
  roster_json JSON DEFAULT NULL,
  teams_json JSON DEFAULT NULL,
  result_json JSON DEFAULT NULL,
  winner_team TINYINT DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_rift_owner (owner_id,status),
  INDEX idx_rift_opponent (opponent_id,status),
  INDEX idx_rift_status (status,created_at),
  CONSTRAINT fk_rift_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rift_opponent FOREIGN KEY (opponent_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
