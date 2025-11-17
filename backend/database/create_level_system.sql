-- 레벨 시스템 추가
-- 최대 레벨: 30
-- 30레벨 달성에 최소 500판 필요

-- 1. users 테이블에 레벨 및 경험치 컬럼 추가
ALTER TABLE users
ADD COLUMN IF NOT EXISTS level INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS exp INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_exp INT DEFAULT 0;

-- 2. 레벨별 보상 테이블
CREATE TABLE IF NOT EXISTS level_rewards (
    level INT PRIMARY KEY,
    required_exp INT NOT NULL, -- 이 레벨에 도달하기 위한 누적 경험치
    reward_points INT NOT NULL, -- 레벨업 시 받는 포인트
    reward_description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 유저 레벨 보상 수령 기록
CREATE TABLE IF NOT EXISTS user_level_rewards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    level INT NOT NULL,
    reward_points INT NOT NULL,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_level (user_id, level),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 레벨별 필요 경험치 및 보상 설정
-- 30레벨까지 500판 = 총 경험치 50,000 필요 (판당 평균 100 경험치)
-- 초반엔 빠르게, 후반엔 느리게 레벨업 (지수 증가)

INSERT INTO level_rewards (level, required_exp, reward_points, reward_description) VALUES
(1, 0, 0, '시작'),
(2, 150, 100, '레벨 2 달성'),
(3, 350, 100, '레벨 3 달성'),
(4, 600, 150, '레벨 4 달성'),
(5, 900, 150, '레벨 5 달성'),
(6, 1250, 200, '레벨 6 달성'),
(7, 1650, 200, '레벨 7 달성'),
(8, 2100, 250, '레벨 8 달성'),
(9, 2600, 250, '레벨 9 달성'),
(10, 3150, 500, '레벨 10 달성 - 특별 보너스!'),
(11, 3800, 300, '레벨 11 달성'),
(12, 4500, 300, '레벨 12 달성'),
(13, 5250, 350, '레벨 13 달성'),
(14, 6050, 350, '레벨 14 달성'),
(15, 6900, 400, '레벨 15 달성'),
(16, 7800, 400, '레벨 16 달성'),
(17, 8750, 450, '레벨 17 달성'),
(18, 9750, 450, '레벨 18 달성'),
(19, 10800, 500, '레벨 19 달성'),
(20, 12000, 1000, '레벨 20 달성 - 대박 보너스!'),
(21, 13300, 550, '레벨 21 달성'),
(22, 14700, 550, '레벨 22 달성'),
(23, 16200, 600, '레벨 23 달성'),
(24, 17800, 600, '레벨 24 달성'),
(25, 19500, 700, '레벨 25 달성'),
(26, 21300, 700, '레벨 26 달성'),
(27, 23200, 800, '레벨 27 달성'),
(28, 25200, 800, '레벨 28 달성'),
(29, 27300, 900, '레벨 29 달성'),
(30, 30000, 2000, '레벨 30 달성 - 최대 레벨!')
ON DUPLICATE KEY UPDATE
    required_exp = VALUES(required_exp),
    reward_points = VALUES(reward_points),
    reward_description = VALUES(reward_description);

-- 경험치 획득량 정의 (코멘트로만 기록)
-- 일반전 승리: 100 exp, 패배: 50 exp
-- 랭크전 승리: 120 exp, 패배: 60 exp
-- AI 매치 승리: 80 exp, 패배: 40 exp
-- VS 모드 클리어: 150 exp, 실패: 75 exp
