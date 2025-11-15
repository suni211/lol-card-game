-- VS Mode tables
CREATE TABLE IF NOT EXISTS vs_stages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stage_number INT NOT NULL,
  stage_name VARCHAR(100) NOT NULL,
  is_boss BOOLEAN DEFAULT FALSE,
  reward_points INT NOT NULL,
  hard_mode_multiplier INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_stage (stage_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vs_stage_enemies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stage_id INT NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  enhancement_level INT DEFAULT 0,
  hard_enhancement_level INT DEFAULT 0,
  position_order INT NOT NULL,
  FOREIGN KEY (stage_id) REFERENCES vs_stages(id) ON DELETE CASCADE,
  INDEX idx_stage_id (stage_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_vs_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  current_stage INT DEFAULT 1,
  hard_mode_unlocked BOOLEAN DEFAULT FALSE,
  stages_cleared JSON,
  hard_stages_cleared JSON,
  total_points_earned INT DEFAULT 0,
  last_played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_progress (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_ladder_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  current_win_streak INT DEFAULT 0,
  best_win_streak INT DEFAULT 0,
  total_streak_bonus INT DEFAULT 0,
  last_match_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_ladder (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert VS Mode stages
INSERT INTO vs_stages (stage_number, stage_name, is_boss, reward_points) VALUES
(1, '1단계 - 신인 도전', FALSE, 100),
(2, '2단계 - 성장하는 선수들', FALSE, 200),
(3, '3단계 - 중간보스', TRUE, 1000),
(4, '4단계 - 강력한 상대', FALSE, 500),
(5, '5단계 - 스타 플레이어', FALSE, 3000),
(6, '6단계 - 중간보스', TRUE, 5000),
(7, '7단계 - 중간보스', TRUE, 10000),
(8, '8단계 - 챔피언들', FALSE, 5000),
(9, '9단계 - T1 왕조', FALSE, 10000),
(10, '10단계 - 최종보스', TRUE, 50000);

-- Insert stage 1 enemies
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order) VALUES
(1, 'DuDu', 0, 2, 1),
(1, 'Pyosik', 0, 2, 2),
(1, 'BuLLDoG', 0, 2, 3),
(1, 'Berserker', 0, 2, 4),
(1, 'Life', 0, 2, 5);

-- Insert stage 2 enemies
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order) VALUES
(2, 'Rich', 0, 3, 1),
(2, 'Sponge', 0, 3, 2),
(2, 'Kyeahoo', 0, 3, 3),
(2, 'Teddy', 2, 3, 4),
(2, 'Andil', 1, 3, 5);

-- Insert stage 3 enemies (중간보스)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order) VALUES
(3, 'Morgan', 3, 5, 1),
(3, 'Croco', 3, 5, 2),
(3, 'Clozer', 5, 5, 3),
(3, 'Hype', 3, 5, 4),
(3, 'Pollu', 3, 5, 5);

-- Insert stage 4 enemies
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order) VALUES
(4, 'Kingen', 3, 5, 1),
(4, 'GIDEON', 3, 5, 2),
(4, 'Calix', 3, 5, 3),
(4, 'Jiwoo', 3, 5, 4),
(4, 'Lehends', 3, 5, 5);

-- Insert stage 5 enemies
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order) VALUES
(5, 'Siwoo', 1, 3, 1),
(5, 'Lucid', 1, 3, 2),
(5, 'ShowMaker', 3, 6, 3),
(5, 'Aiming', 3, 6, 4),
(5, 'BeryL', 1, 5, 5);

-- Insert stage 6 enemies (중간보스)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order) VALUES
(6, 'Clear', 5, 8, 1),
(6, 'Raptor', 5, 8, 2),
(6, 'VicLa', 5, 8, 3),
(6, 'Diable', 5, 8, 4),
(6, 'Kellin', 5, 8, 5);

-- Insert stage 7 enemies (중간보스)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order) VALUES
(7, 'PerfecT', 5, 8, 1),
(7, 'Cuzz', 5, 8, 2),
(7, 'Bdd', 5, 8, 3),
(7, 'deokdam', 5, 8, 4),
(7, 'Peter', 5, 8, 5);

-- Insert stage 8 enemies
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order) VALUES
(8, 'Zeus', 5, 8, 1),
(8, 'Peanut', 5, 8, 2),
(8, 'zeka', 3, 6, 3),
(8, 'Viper', 3, 6, 4),
(8, 'Delight', 3, 6, 5);

-- Insert stage 9 enemies
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order) VALUES
(9, 'Doran', 6, 8, 1),
(9, 'Oner', 6, 8, 2),
(9, 'Faker', 6, 8, 3),
(9, 'Gumayusi', 6, 8, 4),
(9, 'Keria', 6, 8, 5);

-- Insert stage 10 enemies (최종보스)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order) VALUES
(10, 'Kiin', 8, 10, 1),
(10, 'Canyon', 8, 10, 2),
(10, 'Chovy', 8, 10, 3),
(10, 'Ruler', 8, 10, 4),
(10, 'Duro', 8, 10, 5);
