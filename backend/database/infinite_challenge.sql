-- 무한 도전 모드 시스템

-- 무한 도전 진행 상황
CREATE TABLE IF NOT EXISTS infinite_challenge_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    current_stage INT DEFAULT 1,
    highest_stage INT DEFAULT 1,
    is_active BOOLEAN DEFAULT FALSE,
    total_rewards INT DEFAULT 0,
    started_at TIMESTAMP NULL,
    last_played_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (user_id),
    INDEX idx_highest_stage (highest_stage DESC),
    INDEX idx_active (is_active, current_stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 무한 도전 매치 기록
CREATE TABLE IF NOT EXISTS infinite_challenge_matches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    stage INT NOT NULL,
    user_deck_id INT,
    ai_difficulty INT NOT NULL COMMENT 'AI 난이도 (stage와 동일)',
    user_score INT DEFAULT 0,
    ai_score INT DEFAULT 0,
    is_victory BOOLEAN,
    total_damage INT DEFAULT 0,
    rewards_earned INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_stage (user_id, stage DESC),
    INDEX idx_stage (stage DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 무한 도전 리더보드 (주간)
CREATE TABLE IF NOT EXISTS infinite_challenge_leaderboard (
    id INT PRIMARY KEY AUTO_INCREMENT,
    week_start DATE NOT NULL,
    user_id INT NOT NULL,
    highest_stage INT NOT NULL,
    total_rewards INT DEFAULT 0,
    rank_position INT,
    reward_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_week_user (week_start, user_id),
    INDEX idx_week_rank (week_start, rank_position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 무한 도전 보상 테이블 (단계별 보상 공식)
-- 보상 공식: stage * 50 + (stage * stage * 10)
-- 예시:
-- Stage 1: 60P
-- Stage 5: 500P
-- Stage 10: 1500P
-- Stage 20: 5000P
-- Stage 50: 27500P
-- Stage 100: 105000P
