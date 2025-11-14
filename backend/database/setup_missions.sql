-- Clear existing missions
DELETE FROM user_missions;
DELETE FROM missions;

-- Reset auto increment
ALTER TABLE missions AUTO_INCREMENT = 1;

-- Daily Missions (50PT each)
INSERT INTO missions (title, description, type, requirement, reward) VALUES
('일일 AI 배틀', 'AI 배틀 60판 완료', 'DAILY', 60, 50),
('일일 랭크 매치', '랭크 매치 3판 완료', 'DAILY', 3, 50),
('일일 카드 뽑기', '카드 1번 뽑기', 'DAILY', 1, 50);

-- Weekly Missions (100PT each)
INSERT INTO missions (title, description, type, requirement, reward) VALUES
('주간 AI 배틀', 'AI 배틀 1000판 완료', 'WEEKLY', 1000, 100),
('주간 랭크 매치', '랭크 매치 10판 완료', 'WEEKLY', 10, 100),
('주간 카드 뽑기', '카드 3번 뽑기', 'WEEKLY', 3, 100);

-- Monthly Missions (500PT each)
INSERT INTO missions (title, description, type, requirement, reward) VALUES
('월간 AI 배틀', 'AI 배틀 5000판 완료', 'MONTHLY', 5000, 500),
('월간 카드 뽑기', '카드 20번 뽑기', 'MONTHLY', 20, 500);

-- Add mission_type column to missions if not exists
ALTER TABLE missions ADD COLUMN IF NOT EXISTS mission_type VARCHAR(20) DEFAULT 'ai_battle' AFTER type;

-- Update mission types
UPDATE missions SET mission_type = 'ai_battle' WHERE title LIKE '%AI 배틀%';
UPDATE missions SET mission_type = 'rank_match' WHERE title LIKE '%랭크 매치%';
UPDATE missions SET mission_type = 'gacha' WHERE title LIKE '%카드 뽑기%';
