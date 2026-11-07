-- Six match attributes; preserve every existing OVR and legacy player_stat.
-- Required before deploying the competitive PvP routes.
USE lol_card_game;

ALTER TABLE player_stats
  ADD COLUMN IF NOT EXISTS cs INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS shotcalling INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS clutch INT NOT NULL DEFAULT 50;

-- Existing custom stats remain untouched. Missing player stat records are
-- initialized from each player's OVR, clamped to the existing 0..100 range.
INSERT IGNORE INTO player_stats
  (player_id, laning, mechanics, teamfight, vision, macro, mental, cs, shotcalling, clutch)
SELECT p.id,
  LEAST(100,GREATEST(0,p.overall)),LEAST(100,GREATEST(0,p.overall)),
  LEAST(100,GREATEST(0,p.overall)),LEAST(100,GREATEST(0,p.overall)),
  LEAST(100,GREATEST(0,p.overall)),LEAST(100,GREATEST(0,p.overall)),
  LEAST(100,GREATEST(0,p.overall)),LEAST(100,GREATEST(0,p.overall)),
  LEAST(100,GREATEST(0,p.overall))
FROM players p LEFT JOIN player_stats ps ON ps.player_id=p.id
WHERE ps.id IS NULL;

CREATE TABLE IF NOT EXISTS competitive_queue_v2 (
  user_id INT NOT NULL PRIMARY KEY,
  roster_json LONGTEXT NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_competitive_queue_joined (joined_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS competitive_matches_v2 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  player1_id INT NOT NULL,
  player2_id INT NOT NULL,
  roster1_json LONGTEXT NOT NULL,
  roster2_json LONGTEXT NOT NULL,
  wins1 TINYINT NOT NULL DEFAULT 0,
  wins2 TINYINT NOT NULL DEFAULT 0,
  round_number TINYINT NOT NULL DEFAULT 1,
  choice1 ENUM('MACRO','TEAMFIGHT','OBJECTIVE') NULL,
  choice2 ENUM('MACRO','TEAMFIGHT','OBJECTIVE') NULL,
  rounds_json LONGTEXT NOT NULL,
  status ENUM('ACTIVE','COMPLETED') NOT NULL DEFAULT 'ACTIVE',
  winner_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_competitive_p1 (player1_id,status),
  INDEX idx_competitive_p2 (player2_id,status),
  FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
