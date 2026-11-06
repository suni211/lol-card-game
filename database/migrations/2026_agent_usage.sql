-- Additive setup for the existing agent cooldown system.
USE lol_card_game;
CREATE TABLE IF NOT EXISTS agent_usage (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  agent_type ENUM('daily','weekly','monthly') NOT NULL,
  last_used TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_agent_user_type (user_id,agent_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
