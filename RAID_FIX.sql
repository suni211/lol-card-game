-- 레이드 시스템 테이블 재생성

-- 기존 테이블 삭제 (안전하게)
DROP TABLE IF EXISTS raid_participants;
DROP TABLE IF EXISTS raid_bosses;

-- raid_bosses 테이블 생성
CREATE TABLE raid_bosses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  max_hp INT NOT NULL,
  current_hp INT NOT NULL,
  reward_multiplier DECIMAL(3,1) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  INDEX idx_active (is_active, started_at DESC)
);

-- raid_participants 테이블 생성
CREATE TABLE raid_participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  raid_boss_id INT NOT NULL,
  user_id INT NOT NULL,
  damage_dealt BIGINT DEFAULT 0,
  attempts INT DEFAULT 0,
  last_attack_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (raid_boss_id) REFERENCES raid_bosses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_raid_user (raid_boss_id, user_id),
  INDEX idx_damage (raid_boss_id, damage_dealt DESC),
  INDEX idx_user_attack (user_id, last_attack_at)
);

-- 확인
SELECT 'Tables created successfully' as status;
SHOW TABLES LIKE 'raid%';
