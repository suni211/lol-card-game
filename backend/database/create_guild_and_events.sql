-- 길드 시스템 및 이벤트 시스템 추가

-- 1. 길드 테이블
CREATE TABLE IF NOT EXISTS guilds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    tag VARCHAR(3) NOT NULL UNIQUE, -- 3글자 약자
    description TEXT,
    leader_id INT NOT NULL,
    points INT DEFAULT 0, -- 길드 포인트
    level INT DEFAULT 1,
    max_members INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tag (tag),
    INDEX idx_leader (leader_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 길드 멤버 테이블
CREATE TABLE IF NOT EXISTS guild_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guild_id INT NOT NULL,
    user_id INT NOT NULL UNIQUE, -- 한 유저는 하나의 길드만
    role ENUM('LEADER', 'OFFICER', 'MEMBER') DEFAULT 'MEMBER',
    contribution INT DEFAULT 0, -- 개인 기여도
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_guild (guild_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. users 테이블에 guild_id 추가
ALTER TABLE users
ADD COLUMN IF NOT EXISTS guild_id INT DEFAULT NULL,
ADD FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE SET NULL;

-- 4. 길드 주간 미션 풀 (30개 미션)
CREATE TABLE IF NOT EXISTS guild_mission_pool (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    requirement INT NOT NULL,
    mission_type ENUM('WIN', 'MATCH', 'PERFECT', 'COMEBACK', 'STREAK', 'AI', 'VS', 'TOTAL_DAMAGE', 'COLLECT') NOT NULL,
    reward_points INT NOT NULL,
    difficulty ENUM('EASY', 'MEDIUM', 'HARD') DEFAULT 'MEDIUM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 길드 주간 미션 (매주 5개 선택)
CREATE TABLE IF NOT EXISTS guild_weekly_missions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guild_id INT NOT NULL,
    mission_id INT NOT NULL,
    current_progress INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    week_start DATE NOT NULL,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES guild_mission_pool(id) ON DELETE CASCADE,
    UNIQUE KEY unique_guild_mission_week (guild_id, mission_id, week_start),
    INDEX idx_guild_week (guild_id, week_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 해피아워 이벤트 참여 기록
CREATE TABLE IF NOT EXISTS happy_hour_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    event_date DATE NOT NULL,
    event_type ENUM('HAPPY_HOUR', 'HOT_TIME') NOT NULL,
    points_earned INT NOT NULL,
    participated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_event_date (user_id, event_date, event_type),
    INDEX idx_event_date (event_date, event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 매치 보너스 기록 (역전승, 퍼펙트, 연승)
CREATE TABLE IF NOT EXISTS match_bonuses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    match_id INT,
    bonus_type ENUM('PERFECT', 'COMEBACK', 'STREAK_3', 'STREAK_5', 'STREAK_10') NOT NULL,
    bonus_points INT NOT NULL,
    streak_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_type (bonus_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 길드 미션 풀 30개 삽입
INSERT INTO guild_mission_pool (title, description, requirement, mission_type, reward_points, difficulty) VALUES
-- EASY (10개)
('랭크전 10승', '길드원들이 랭크전에서 총 10승 달성', 10, 'WIN', 500, 'EASY'),
('일반전 20승', '길드원들이 일반전에서 총 20승 달성', 20, 'WIN', 500, 'EASY'),
('AI 배틀 50승', '길드원들이 AI 배틀에서 총 50승 달성', 50, 'WIN', 500, 'EASY'),
('VS 모드 10클리어', '길드원들이 VS 모드 총 10번 클리어', 10, 'VS', 500, 'EASY'),
('총 50경기 참여', '길드원들이 총 50경기 참여', 50, 'MATCH', 500, 'EASY'),
('랭크전 5경기', '길드원들이 랭크전 총 5경기 참여', 5, 'MATCH', 300, 'EASY'),
('일반전 10경기', '길드원들이 일반전 총 10경기 참여', 10, 'MATCH', 300, 'EASY'),
('AI 배틀 30경기', '길드원들이 AI 배틀 총 30경기 참여', 30, 'MATCH', 300, 'EASY'),
('승리 15회', '길드원들이 모든 모드에서 총 15승', 15, 'WIN', 400, 'EASY'),
('경기 참여 30회', '길드원들이 모든 모드에서 총 30경기 참여', 30, 'MATCH', 400, 'EASY'),

-- MEDIUM (10개)
('랭크전 30승', '길드원들이 랭크전에서 총 30승 달성', 30, 'WIN', 1000, 'MEDIUM'),
('일반전 50승', '길드원들이 일반전에서 총 50승 달성', 50, 'WIN', 1000, 'MEDIUM'),
('AI 배틀 100승', '길드원들이 AI 배틀에서 총 100승 달성', 100, 'WIN', 1000, 'MEDIUM'),
('VS 모드 30클리어', '길드원들이 VS 모드 총 30번 클리어', 30, 'VS', 1000, 'MEDIUM'),
('퍼펙트 게임 10회', '길드원들이 3:0 승리 총 10회', 10, 'PERFECT', 1500, 'MEDIUM'),
('역전승 5회', '길드원들이 역전승(0:2→3:2) 총 5회', 5, 'COMEBACK', 2000, 'MEDIUM'),
('연승 50회 달성', '길드원 전체 3연승 횟수 총 50회', 50, 'STREAK', 1200, 'MEDIUM'),
('총 100경기 참여', '길드원들이 총 100경기 참여', 100, 'MATCH', 800, 'MEDIUM'),
('승리 50회', '길드원들이 모든 모드에서 총 50승', 50, 'WIN', 1200, 'MEDIUM'),
('경기 참여 80회', '길드원들이 모든 모드에서 총 80경기 참여', 80, 'MATCH', 800, 'MEDIUM'),

-- HARD (10개)
('랭크전 100승', '길드원들이 랭크전에서 총 100승 달성', 100, 'WIN', 3000, 'HARD'),
('일반전 150승', '길드원들이 일반전에서 총 150승 달성', 150, 'WIN', 3000, 'HARD'),
('AI 배틀 300승', '길드원들이 AI 배틀에서 총 300승 달성', 300, 'WIN', 3000, 'HARD'),
('VS 모드 50클리어', '길드원들이 VS 모드 총 50번 클리어', 50, 'VS', 3000, 'HARD'),
('퍼펙트 게임 30회', '길드원들이 3:0 승리 총 30회', 30, 'PERFECT', 4000, 'HARD'),
('역전승 15회', '길드원들이 역전승(0:2→3:2) 총 15회', 15, 'COMEBACK', 5000, 'HARD'),
('5연승 20회 달성', '길드원 전체 5연승 횟수 총 20회', 20, 'STREAK', 4000, 'HARD'),
('10연승 5회 달성', '길드원 전체 10연승 횟수 총 5회', 5, 'STREAK', 6000, 'HARD'),
('총 300경기 참여', '길드원들이 총 300경기 참여', 300, 'MATCH', 2500, 'HARD'),
('승리 150회', '길드원들이 모든 모드에서 총 150승', 150, 'WIN', 3500, 'HARD');
