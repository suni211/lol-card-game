-- Tutorial system for new users
-- Run this SQL in your database

-- User tutorial progress
CREATE TABLE IF NOT EXISTS user_tutorial_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  current_step INT DEFAULT 1,
  completed_steps JSON DEFAULT '[]',
  is_completed BOOLEAN DEFAULT FALSE,
  reward_claimed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY (user_id)
);

-- Tutorial steps definition
-- Step 1: 가챠 뽑기 (Draw gacha)
-- Step 2: 덱 만들기 (Create deck)
-- Step 3: AI 대전하기 (Play AI battle)
-- Step 4: 카드 강화하기 (Enhance card)
-- Step 5: VS 모드 체험 (Try VS mode)
-- Step 6: 랭크 매치 하기 (Play ranked match)
-- Final: 10000 포인트 보상 받기

-- Index for faster lookups
CREATE INDEX idx_user_tutorial ON user_tutorial_progress(user_id, is_completed);
