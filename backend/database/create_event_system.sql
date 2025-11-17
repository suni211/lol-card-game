-- 이벤트 시스템 생성
-- 기간: 2025-11-17 ~ 2025-12-17

-- 1. 이벤트 퀘스트 테이블
CREATE TABLE IF NOT EXISTS event_quests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    quest_type ENUM('NORMAL_MATCH', 'RANKED_MATCH', 'AI_MATCH') NOT NULL,
    requirement INT NOT NULL, -- 요구 횟수
    reward_mileage INT NOT NULL, -- 보상 마일리지
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quest_type (quest_type),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 이벤트 마일스톤 테이블
CREATE TABLE IF NOT EXISTS event_milestones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    required_mileage INT NOT NULL UNIQUE, -- 필요 마일리지
    reward_type ENUM('POINTS', 'CARD_PACK', 'CARD_GUARANTEED') NOT NULL, -- 보상 타입
    reward_points INT DEFAULT 0, -- 포인트 보상
    reward_card_min_overall INT, -- 카드팩 최소 오버롤
    reward_card_guaranteed_overall INT, -- 확정 카드 오버롤
    reward_card_count INT DEFAULT 1, -- 카드 개수
    reward_g2_probability DECIMAL(5,3) DEFAULT 0, -- G2 카드 확률 (0.5% = 0.005)
    description TEXT, -- 보상 설명
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_required_mileage (required_mileage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 유저 이벤트 진행도 테이블
CREATE TABLE IF NOT EXISTS user_event_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    normal_match_today INT DEFAULT 0, -- 오늘 일반전 횟수
    ranked_match_today INT DEFAULT 0, -- 오늘 랭킹전 횟수
    ai_match_today INT DEFAULT 0, -- 오늘 AI 매치 횟수
    total_mileage INT DEFAULT 0, -- 총 마일리지
    last_quest_date DATE, -- 마지막 퀘스트 날짜
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (user_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 유저 이벤트 보상 테이블
CREATE TABLE IF NOT EXISTS user_event_rewards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    milestone_id INT NOT NULL,
    reward_type ENUM('POINTS', 'CARD_PACK', 'CARD_GUARANTEED') NOT NULL,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (milestone_id) REFERENCES event_milestones(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_milestone (user_id, milestone_id),
    INDEX idx_user_id (user_id),
    INDEX idx_milestone_id (milestone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 이벤트 보상 카드 인벤토리 테이블
CREATE TABLE IF NOT EXISTS event_reward_cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    reward_id INT NOT NULL, -- user_event_rewards의 id
    user_card_id INT, -- 받은 카드 (user_cards의 id)
    is_claimed BOOLEAN DEFAULT FALSE, -- 인벤토리에서 받았는지 여부
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    claimed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES user_event_rewards(id) ON DELETE CASCADE,
    FOREIGN KEY (user_card_id) REFERENCES user_cards(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_reward_id (reward_id),
    INDEX idx_is_claimed (is_claimed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 초기 퀘스트 데이터 삽입
INSERT INTO event_quests (title, description, quest_type, requirement, reward_mileage, start_date, end_date) VALUES
('일반전 데일리 퀘스트', '하루에 일반전 3판을 플레이하세요', 'NORMAL_MATCH', 3, 50, '2025-11-17', '2025-12-17'),
('랭킹전 데일리 퀘스트', '하루에 랭킹전 3판을 플레이하세요', 'RANKED_MATCH', 3, 50, '2025-11-17', '2025-12-17'),
('AI 매치 데일리 퀘스트', '하루에 AI 매치 1000판을 플레이하세요', 'AI_MATCH', 1000, 100, '2025-11-17', '2025-12-17');

-- 초기 마일스톤 데이터 삽입
INSERT INTO event_milestones (required_mileage, reward_type, reward_points, reward_card_min_overall, reward_card_guaranteed_overall, reward_card_count, reward_g2_probability, description) VALUES
(300, 'POINTS', 100, NULL, NULL, 0, 0, '100 포인트'),
(600, 'POINTS', 300, NULL, NULL, 0, 0, '300 포인트'),
(1000, 'CARD_PACK', 0, 99, NULL, 1, 0, '오버롤 99 이상 팩 카드'),
(2000, 'CARD_PACK', 500, 100, NULL, 1, 0, '오버롤 100 이상 팩 카드, 500 포인트'),
(3000, 'CARD_PACK', 1000, 100, NULL, 1, 0, '오버롤 100 이상 팩 카드, 1000 포인트'),
(4000, 'CARD_PACK', 1500, 101, NULL, 1, 0, '오버롤 101 이상 팩 카드, 1500 포인트'),
(5000, 'CARD_PACK', 2000, 95, NULL, 1, 0.005, '(G2 카드 포함 확률 0.5%) 오버롤 95 이상 팩 카드, 2000 포인트'),
(5600, 'CARD_GUARANTEED', 10000, 90, 107, 1, 0.0035, '오버롤 107 이상 확정 카드, G2 카드 포함 (확률 0.35%) 오버롤 90 이상 팩 카드, 10000 포인트');
