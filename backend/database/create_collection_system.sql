-- 카드 도감 시스템

-- 유저 도감 진행도 테이블
CREATE TABLE IF NOT EXISTS user_collection_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    total_cards_collected INT DEFAULT 0,
    total_reward_points INT DEFAULT 0,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 유저가 수집한 카드 기록
CREATE TABLE IF NOT EXISTS user_collected_cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    player_id INT NOT NULL,
    first_obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_obtained INT DEFAULT 1, -- 같은 카드를 여러번 얻을 수 있음
    reward_claimed BOOLEAN DEFAULT FALSE,
    reward_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_player (user_id, player_id),
    INDEX idx_user_id (user_id),
    INDEX idx_player_id (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 도감 달성 보상 (마일스톤)
CREATE TABLE IF NOT EXISTS collection_milestones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    required_cards INT NOT NULL UNIQUE, -- 필요한 카드 수
    reward_points INT NOT NULL, -- 보상 포인트
    milestone_type ENUM('TOTAL', 'TIER', 'SEASON', 'TEAM') DEFAULT 'TOTAL',
    filter_value VARCHAR(50), -- TIER면 'LEGENDARY', SEASON이면 '2024', TEAM이면 'T1' 등
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_required_cards (required_cards)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 유저가 달성한 마일스톤
CREATE TABLE IF NOT EXISTS user_collection_milestones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    milestone_id INT NOT NULL,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (milestone_id) REFERENCES collection_milestones(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_milestone (user_id, milestone_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 초기 마일스톤 데이터
INSERT INTO collection_milestones (required_cards, reward_points, milestone_type, description) VALUES
(10, 100, 'TOTAL', '도감 10장 달성'),
(25, 300, 'TOTAL', '도감 25장 달성'),
(50, 700, 'TOTAL', '도감 50장 달성'),
(100, 1500, 'TOTAL', '도감 100장 달성'),
(200, 3500, 'TOTAL', '도감 200장 달성'),
(300, 6000, 'TOTAL', '도감 300장 달성'),
(500, 12000, 'TOTAL', '도감 500장 달성'),
(5, 200, 'TIER', 'LEGENDARY 티어 5장 달성'),
(10, 500, 'TIER', 'LEGENDARY 티어 10장 달성'),
(5, 300, 'SEASON', '19G2 시즌 5장 달성'),
(10, 700, 'SEASON', '19G2 시즌 10장 달성'),
(5, 250, 'TEAM', 'T1 팀 5장 달성'),
(10, 600, 'TEAM', 'T1 팀 10장 달성');

-- 티어별 마일스톤 추가
UPDATE collection_milestones SET filter_value = 'LEGENDARY' WHERE milestone_type = 'TIER';

-- 시즌별 마일스톤 추가
UPDATE collection_milestones SET filter_value = '19G2' WHERE milestone_type = 'SEASON';

-- 팀별 마일스톤 추가
UPDATE collection_milestones SET filter_value = 'T1' WHERE milestone_type = 'TEAM';
