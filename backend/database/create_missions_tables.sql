-- Create missions table
CREATE TABLE IF NOT EXISTS missions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  type ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL,
  mission_type VARCHAR(20) DEFAULT 'ai_battle',
  requirement INT NOT NULL,
  reward INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create user_missions table
CREATE TABLE IF NOT EXISTS user_missions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  mission_id INT NOT NULL,
  progress INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  is_claimed BOOLEAN DEFAULT FALSE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_mission (user_id, mission_id, expires_at)
);

-- Insert default missions
INSERT INTO missions (title, description, type, mission_type, requirement, reward) VALUES
-- Daily Missions (50PT each)
('일일 AI 배틀', 'AI 배틀 60판 완료', 'DAILY', 'ai_battle', 60, 50),
('일일 랭크 매치', '랭크 매치 3판 완료', 'DAILY', 'rank_match', 3, 50),
('일일 카드 뽑기', '카드 1번 뽑기', 'DAILY', 'gacha', 1, 50),

-- Weekly Missions (100PT each)
('주간 AI 배틀', 'AI 배틀 1000판 완료', 'WEEKLY', 'ai_battle', 1000, 100),
('주간 랭크 매치', '랭크 매치 10판 완료', 'WEEKLY', 'rank_match', 10, 100),
('주간 카드 뽑기', '카드 3번 뽑기', 'WEEKLY', 'gacha', 3, 100),

-- Monthly Missions (500PT each)
('월간 AI 배틀', 'AI 배틀 5000판 완료', 'MONTHLY', 'ai_battle', 5000, 500),
('월간 카드 뽑기', '카드 20번 뽑기', 'MONTHLY', 'gacha', 20, 500);
