-- Compatibility tables for currently mounted campaign and infinite-challenge APIs.
-- Additive/idempotent; no existing player, user, or progress rows are deleted.
USE lol_card_game;

CREATE TABLE IF NOT EXISTS campaign_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  region VARCHAR(12) NOT NULL,
  stage_number INT NOT NULL,
  difficulty VARCHAR(30) NOT NULL,
  required_power INT NOT NULL,
  points_reward INT NOT NULL,
  first_clear_bonus INT NOT NULL DEFAULT 0,
  three_star_bonus INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_campaign_stage (region,stage_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_campaign_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  stage_id INT NOT NULL,
  stars INT NOT NULL DEFAULT 0,
  best_score INT NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  UNIQUE KEY uq_user_campaign (user_id,stage_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES campaign_stages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Starter campaign is generated only where missing. Rewards are in-game test values.
INSERT IGNORE INTO campaign_stages
  (region,stage_number,difficulty,required_power,points_reward,first_clear_bonus,three_star_bonus)
SELECT seed.region, step.stage_number, seed.difficulty,
       seed.base_power + (step.stage_number-1)*25,
       seed.base_reward + (step.stage_number-1)*10,
       100 + step.stage_number*20,
       50 + step.stage_number*10
FROM (
  SELECT 'LCP' AS region, '입문' AS difficulty, 250 AS base_power, 75 AS base_reward
  UNION ALL SELECT 'LTA', '초급', 300, 90
  UNION ALL SELECT 'LEC', '중급', 350, 110
  UNION ALL SELECT 'LPL', '고급', 400, 130
  UNION ALL SELECT 'LCK', '최상급', 450, 160
) seed
CROSS JOIN (
  SELECT 1 AS stage_number UNION ALL SELECT 2 UNION ALL SELECT 3
  UNION ALL SELECT 4 UNION ALL SELECT 5
) step;

CREATE TABLE IF NOT EXISTS infinite_challenge_progress (
  user_id INT NOT NULL PRIMARY KEY,
  current_stage INT NOT NULL DEFAULT 1,
  highest_stage INT NOT NULL DEFAULT 1,
  total_rewards INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  started_at DATETIME NULL,
  last_played_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS infinite_challenge_matches (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  stage INT NOT NULL,
  ai_difficulty INT NOT NULL,
  user_score INT NOT NULL,
  ai_score INT NOT NULL,
  is_victory BOOLEAN NOT NULL,
  total_damage INT NOT NULL DEFAULT 0,
  rewards_earned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_infinite_user_stage (user_id,stage),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS infinite_challenge_battle_state (
  user_id INT NOT NULL PRIMARY KEY,
  stage INT NOT NULL,
  player_power INT NOT NULL,
  ai_power INT NOT NULL,
  ai_difficulty INT NOT NULL,
  won BOOLEAN NOT NULL,
  player_score INT NOT NULL,
  ai_score INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS infinite_challenge_leaderboard (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  week_start DATE NOT NULL,
  user_id INT NOT NULL,
  highest_stage INT NOT NULL DEFAULT 1,
  total_rewards INT NOT NULL DEFAULT 0,
  rank_position INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_infinite_week (week_start,user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT (SELECT COUNT(*) FROM campaign_stages) AS campaign_stages,
       (SELECT COUNT(*) FROM infinite_challenge_progress) AS challenge_players;
