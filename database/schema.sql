-- LOL Card Game Database Schema

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS lol_card_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lol_card_game;

-- 1. Users 테이블
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    points INT DEFAULT 1000,
    tier ENUM('IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'CHALLENGER') DEFAULT 'IRON',
    rating INT DEFAULT 1000,
    is_admin BOOLEAN DEFAULT FALSE,
    last_check_in DATE,
    consecutive_days INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Players 테이블 (프로 선수 정보)
-- Note: tier is calculated dynamically based on overall rating:
-- 1-80: COMMON, 81-90: RARE, 91-100: EPIC, 101+: LEGENDARY, ICON prefix: ICON
CREATE TABLE players (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    team VARCHAR(50) NOT NULL,
    position ENUM('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT') NOT NULL,
    overall INT NOT NULL CHECK (overall >= 50 AND overall <= 120),
    region ENUM('LCK', 'LTA', 'LPL', 'LEC', 'LCP') NOT NULL,
    season VARCHAR(20),
    market_value INT DEFAULT 0,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_team (team),
    INDEX idx_position (position),
    INDEX idx_overall (overall),
    INDEX idx_season (season)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Player Stats 테이블 (선수 상세 스탯)
CREATE TABLE player_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL UNIQUE,
    laning INT NOT NULL DEFAULT 50 CHECK (laning >= 0 AND laning <= 100),
    mechanics INT NOT NULL DEFAULT 50 CHECK (mechanics >= 0 AND mechanics <= 100),
    teamfight INT NOT NULL DEFAULT 50 CHECK (teamfight >= 0 AND teamfight <= 100),
    vision INT NOT NULL DEFAULT 50 CHECK (vision >= 0 AND vision <= 100),
    macro INT NOT NULL DEFAULT 50 CHECK (macro >= 0 AND macro <= 100),
    mental INT NOT NULL DEFAULT 50 CHECK (mental >= 0 AND mental <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_player_id (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Player Teams 테이블 (다대다 관계 - 선수가 거쳐간 팀들)
CREATE TABLE player_teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL,
    team_name VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_player_id (player_id),
    INDEX idx_team_name (team_name),
    UNIQUE KEY unique_player_team (player_id, team_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Player Traits 테이블
CREATE TABLE player_traits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    effect VARCHAR(100),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_player_id (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. User Cards 테이블 (유저가 보유한 카드)
CREATE TABLE user_cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    player_id INT NOT NULL,
    level INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_player_id (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Decks 테이블
CREATE TABLE decks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(100) DEFAULT 'My Deck',
    top_card_id INT,
    jungle_card_id INT,
    mid_card_id INT,
    adc_card_id INT,
    support_card_id INT,
    laning_strategy ENUM('AGGRESSIVE', 'SAFE', 'ROAMING', 'SCALING', 'PUSH', 'FREEZE', 'TRADE', 'ALLKILL') DEFAULT 'SAFE',
    teamfight_strategy ENUM('ENGAGE', 'DISENGAGE', 'POKE', 'PROTECT', 'SPLIT', 'FLANK', 'KITE', 'DIVE') DEFAULT 'ENGAGE',
    macro_strategy ENUM('OBJECTIVE', 'VISION', 'SPLITPUSH', 'GROUPING', 'PICK', 'SIEGE', 'ROTATION', 'CONTROL') DEFAULT 'OBJECTIVE',
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (top_card_id) REFERENCES user_cards(id) ON DELETE SET NULL,
    FOREIGN KEY (jungle_card_id) REFERENCES user_cards(id) ON DELETE SET NULL,
    FOREIGN KEY (mid_card_id) REFERENCES user_cards(id) ON DELETE SET NULL,
    FOREIGN KEY (adc_card_id) REFERENCES user_cards(id) ON DELETE SET NULL,
    FOREIGN KEY (support_card_id) REFERENCES user_cards(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Matches 테이블
CREATE TABLE matches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player1_id INT NOT NULL,
    player2_id INT NOT NULL,
    player1_deck_id INT NOT NULL,
    player2_deck_id INT NOT NULL,
    winner_id INT,
    player1_score INT DEFAULT 0,
    player2_score INT DEFAULT 0,
    status ENUM('WAITING', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'WAITING',
    match_type ENUM('RANKED', 'PRACTICE', 'AI') DEFAULT 'RANKED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player1_deck_id) REFERENCES decks(id) ON DELETE CASCADE,
    FOREIGN KEY (player2_deck_id) REFERENCES decks(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_player1_id (player1_id),
    INDEX idx_player2_id (player2_id),
    INDEX idx_status (status),
    INDEX idx_match_type (match_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Match History 테이블
CREATE TABLE match_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    match_id INT NOT NULL,
    result ENUM('WIN', 'LOSE') NOT NULL,
    points_change INT NOT NULL,
    rating_change INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Missions 테이블
CREATE TABLE missions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    type ENUM('DAILY', 'WEEKLY') NOT NULL,
    requirement INT NOT NULL,
    reward INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. User Missions 테이블
CREATE TABLE user_missions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    mission_id INT NOT NULL,
    progress INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    is_claimed BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_mission (user_id, mission_id),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Trades 테이블
CREATE TABLE trades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    sender_card_id INT NOT NULL,
    receiver_card_id INT NOT NULL,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_card_id) REFERENCES user_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_card_id) REFERENCES user_cards(id) ON DELETE CASCADE,
    INDEX idx_sender_id (sender_id),
    INDEX idx_receiver_id (receiver_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Notices 테이블
CREATE TABLE notices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type ENUM('NOTICE', 'PATCH', 'EVENT', 'MAINTENANCE') DEFAULT 'NOTICE',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_is_pinned (is_pinned),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. User Stats 테이블
CREATE TABLE user_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    total_matches INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    longest_win_streak INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Gacha History 테이블
CREATE TABLE gacha_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    player_id INT NOT NULL,
    cost INT NOT NULL,
    is_duplicate BOOLEAN DEFAULT FALSE,
    refund_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- BATTLE, COLLECTION, GACHA, SOCIAL, MILESTONE
  difficulty VARCHAR(20) NOT NULL, -- EASY, HARD
  requirement_type VARCHAR(50) NOT NULL, -- total_wins, total_matches, card_count, legendary_count, etc.
  requirement_value INT NOT NULL,
  reward INT NOT NULL, -- Points reward
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements (tracking progress)
CREATE TABLE IF NOT EXISTS user_achievements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  achievement_id INT NOT NULL,
  progress INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  is_claimed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  claimed_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL, -- 1 year from creation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_achievement (user_id, achievement_id, expires_at)
);

-- Insert 50 EASY achievements
INSERT INTO achievements (title, description, category, difficulty, requirement_type, requirement_value, reward) VALUES
-- Battle Easy (15)
('첫 승리', '첫 번째 승리를 달성하세요', 'BATTLE', 'EASY', 'total_wins', 1, 100),
('초보 전사', '10번의 승리를 달성하세요', 'BATTLE', 'EASY', 'total_wins', 10, 200),
('숙련된 파이터', '50번의 승리를 달성하세요', 'BATTLE', 'EASY', 'total_wins', 50, 500),
('첫 AI 승리', 'AI와의 첫 승리를 달성하세요', 'BATTLE', 'EASY', 'ai_wins', 1, 100),
('AI 헌터', 'AI를 10번 격파하세요', 'BATTLE', 'EASY', 'ai_wins', 10, 200),
('랭크 입문', '랭크 게임에서 첫 승리를 달성하세요', 'BATTLE', 'EASY', 'ranked_wins', 1, 150),
('브론즈 정복자', '브론즈 티어에 도달하세요', 'BATTLE', 'EASY', 'reach_tier_bronze', 1, 300),
('실버 도전자', '실버 티어에 도달하세요', 'BATTLE', 'EASY', 'reach_tier_silver', 1, 500),
('골드 승급', '골드 티어에 도달하세요', 'BATTLE', 'EASY', 'reach_tier_gold', 1, 800),
('연승 시작', '2연승을 달성하세요', 'BATTLE', 'EASY', 'win_streak_2', 1, 200),
('배틀 매니아', '총 100경기를 플레이하세요', 'BATTLE', 'EASY', 'total_matches', 100, 500),
('일반전 마스터', '일반전에서 20승을 달성하세요', 'BATTLE', 'EASY', 'practice_wins', 20, 300),
('완벽한 시작', '첫 10경기에서 5승 이상 달성', 'BATTLE', 'EASY', 'first_10_matches_5wins', 1, 500),
('끈기의 전사', '연속으로 5경기 플레이', 'BATTLE', 'EASY', 'consecutive_matches_5', 1, 200),
('주말 전사', '주말에 10경기 플레이', 'BATTLE', 'EASY', 'weekend_matches_10', 1, 300),

-- Collection Easy (15)
('첫 카드', '첫 번째 카드를 획득하세요', 'COLLECTION', 'EASY', 'card_count', 1, 100),
('카드 수집가', '10장의 카드를 수집하세요', 'COLLECTION', 'EASY', 'card_count', 10, 200),
('작은 컬렉션', '30장의 카드를 수집하세요', 'COLLECTION', 'EASY', 'card_count', 30, 400),
('중급 컬렉터', '50장의 카드를 수집하세요', 'COLLECTION', 'EASY', 'card_count', 50, 600),
('레어 헌터', '레어 카드 5장 획득', 'COLLECTION', 'EASY', 'rare_count', 5, 300),
('에픽 시작', '첫 에픽 카드 획득', 'COLLECTION', 'EASY', 'epic_count', 1, 400),
('레전드 입문', '첫 레전드 카드 획득', 'COLLECTION', 'EASY', 'legendary_count', 1, 800),
('TOP 라이너', 'TOP 포지션 카드 5장 수집', 'COLLECTION', 'EASY', 'position_top_count', 5, 200),
('정글러', 'JUNGLE 포지션 카드 5장 수집', 'COLLECTION', 'EASY', 'position_jungle_count', 5, 200),
('미드 라이너', 'MID 포지션 카드 5장 수집', 'COLLECTION', 'EASY', 'position_mid_count', 5, 200),
('원딜러', 'ADC 포지션 카드 5장 수집', 'COLLECTION', 'EASY', 'position_adc_count', 5, 200),
('서포터', 'SUPPORT 포지션 카드 5장 수집', 'COLLECTION', 'EASY', 'position_support_count', 5, 200),
('LCK 팬', 'LCK 카드 10장 수집', 'COLLECTION', 'EASY', 'region_lck_count', 10, 300),
('T1 팬', 'T1 팀 카드 3장 수집', 'COLLECTION', 'EASY', 'team_t1_count', 3, 250),
('카드 강화 시작', '카드 1장을 레벨 5로 강화', 'COLLECTION', 'EASY', 'card_level_5', 1, 300),

-- Gacha Easy (10)
('운을 시험하다', '첫 가챠를 뽑으세요', 'GACHA', 'EASY', 'gacha_count', 1, 100),
('가챠 입문', '10번 가챠를 뽑으세요', 'GACHA', 'EASY', 'gacha_count', 10, 300),
('가챠 중독', '50번 가챠를 뽑으세요', 'GACHA', 'EASY', 'gacha_count', 50, 600),
('프리미엄 맛보기', '프리미엄 가챠 첫 구매', 'GACHA', 'EASY', 'premium_gacha_count', 1, 200),
('울트라 도전', '울트라 가챠 첫 구매', 'GACHA', 'EASY', 'ultra_gacha_count', 1, 300),
('행운의 시작', '가챠에서 에픽 이상 획득', 'GACHA', 'EASY', 'gacha_epic_plus', 1, 400),
('대박!', '가챠에서 레전드 획득', 'GACHA', 'EASY', 'gacha_legendary', 1, 800),
('무료 가챠 마스터', '무료 가챠 20회 사용', 'GACHA', 'EASY', 'free_gacha_count', 20, 400),
('합성 입문', '첫 카드 합성 완료', 'GACHA', 'EASY', 'fusion_count', 1, 200),
('합성 장인', '카드 합성 10회 완료', 'GACHA', 'EASY', 'fusion_count', 10, 500),

-- Social & Milestone Easy (10)
('신규 유저 환영', '계정 생성 완료', 'MILESTONE', 'EASY', 'account_created', 1, 500),
('첫 출석', '첫 일일 출석 완료', 'MILESTONE', 'EASY', 'daily_login_count', 1, 100),
('꾸준함의 시작', '3일 연속 출석', 'MILESTONE', 'EASY', 'consecutive_login_3', 1, 200),
('일주일 도전', '7일 연속 출석', 'MILESTONE', 'EASY', 'consecutive_login_7', 1, 500),
('부자의 시작', '1000 포인트 보유', 'MILESTONE', 'EASY', 'points_owned_1000', 1, 200),
('포인트 수집가', '5000 포인트 보유', 'MILESTONE', 'EASY', 'points_owned_5000', 1, 500),
('첫 미션 완료', '미션 1개 완료', 'MILESTONE', 'EASY', 'mission_completed_count', 1, 150),
('미션 마스터', '미션 10개 완료', 'MILESTONE', 'EASY', 'mission_completed_count', 10, 500),
('덱 빌더 입문', '첫 덱 구성 완료', 'MILESTONE', 'EASY', 'deck_created', 1, 200),
('프로필 완성', '프로필 정보 업데이트', 'MILESTONE', 'EASY', 'profile_updated', 1, 100);

-- Insert 30 HARD achievements
INSERT INTO achievements (title, description, category, difficulty, requirement_type, requirement_value, reward) VALUES
-- Battle Hard (12)
('전쟁의 신', '500번의 승리를 달성하세요', 'BATTLE', 'HARD', 'total_wins', 500, 5000),
('불패의 전설', '1000번의 승리를 달성하세요', 'BATTLE', 'HARD', 'total_wins', 1000, 15000),
('플레티넘 달성', '플레티넘 티어에 도달하세요', 'BATTLE', 'HARD', 'reach_tier_platinum', 1, 3000),
('다이아 정복', '다이아 티어에 도달하세요', 'BATTLE', 'HARD', 'reach_tier_diamond', 1, 5000),
('마스터 승급', '마스터 티어에 도달하세요', 'BATTLE', 'HARD', 'reach_tier_master', 1, 8000),
('그랜드마스터', '그랜드마스터 티어에 도달하세요', 'BATTLE', 'HARD', 'reach_tier_grandmaster', 1, 12000),
('챌린저 등극', '챌린저 티어에 도달하세요', 'BATTLE', 'HARD', 'reach_tier_challenger', 1, 20000),
('연승 행진', '10연승을 달성하세요', 'BATTLE', 'HARD', 'win_streak_10', 1, 3000),
('압도적 승리', '20연승을 달성하세요', 'BATTLE', 'HARD', 'win_streak_20', 1, 8000),
('AI 정복자', 'AI를 100번 격파하세요', 'BATTLE', 'HARD', 'ai_wins', 100, 2000),
('랭크 마스터', '랭크 게임 100승 달성', 'BATTLE', 'HARD', 'ranked_wins', 100, 3000),
('베테랑', '총 1000경기 플레이', 'BATTLE', 'HARD', 'total_matches', 1000, 5000),

-- Collection Hard (8)
('진정한 컬렉터', '200장의 카드 수집', 'COLLECTION', 'HARD', 'card_count', 200, 3000),
('컬렉션 마스터', '500장의 카드 수집', 'COLLECTION', 'HARD', 'card_count', 500, 10000),
('에픽 컬렉터', '에픽 카드 20장 수집', 'COLLECTION', 'HARD', 'epic_count', 20, 3000),
('레전드 컬렉터', '레전드 카드 10장 수집', 'COLLECTION', 'HARD', 'legendary_count', 10, 5000),
('완벽한 팀', '한 팀의 카드 전부 수집 (5포지션)', 'COLLECTION', 'HARD', 'complete_team', 1, 4000),
('카드 마스터', '카드 1장을 최대 레벨(20)로 강화', 'COLLECTION', 'HARD', 'card_level_20', 1, 3000),
('전 포지션 마스터', '각 포지션별 레어 이상 10장씩 수집', 'COLLECTION', 'HARD', 'all_positions_10_rare', 1, 5000),
('레전드 덱', '레전드 카드로만 이루어진 덱 구성', 'COLLECTION', 'HARD', 'legendary_deck', 1, 8000),

-- Gacha Hard (5)
('가챠 광', '500번 가챠 뽑기', 'GACHA', 'HARD', 'gacha_count', 500, 5000),
('월즈 챔피언십', '월즈 우승 가챠 10회 구매', 'GACHA', 'HARD', 'worlds_gacha_count', 10, 3000),
('합성 마스터', '카드 합성 100회 완료', 'GACHA', 'HARD', 'fusion_count', 100, 3000),
('황금 손', '합성으로 레전드 카드 5장 획득', 'GACHA', 'HARD', 'fusion_legendary_count', 5, 5000),
('레전드 헌터', '가챠에서 레전드 카드 20장 획득', 'GACHA', 'HARD', 'gacha_legendary_count', 20, 8000),

-- Milestone Hard (5)
('한 달의 헌신', '30일 연속 출석', 'MILESTONE', 'HARD', 'consecutive_login_30', 1, 3000),
('불굴의 의지', '100일 연속 출석', 'MILESTONE', 'HARD', 'consecutive_login_100', 1, 10000),
('1년의 여정', '365일 연속 출석', 'MILESTONE', 'HARD', 'consecutive_login_365', 1, 50000),
('부의 축적', '100000 포인트 보유', 'MILESTONE', 'HARD', 'points_owned_100000', 1, 5000),
('미션 올클리어', '모든 미션 타입 각 100개씩 완료', 'MILESTONE', 'HARD', 'all_mission_types_100', 1, 10000);
-- Create admin account
-- Username: admin
-- Password: ss092888!
-- Email: admin@berrple.com

USE lol_card_game;

-- Delete existing admin account if exists
DELETE FROM users WHERE email = 'admin@berrple.com';

-- Insert admin account
-- Password hash for "ss092888!" using bcrypt (10 rounds)
INSERT INTO users (
  username,
  email,
  password,
  points,
  tier,
  rating,
  is_admin,
  level,
  exp,
  welcome_packs_remaining,
  referral_code
) VALUES (
  'admin',
  'admin@berrple.com',
  '$2b$10$ANYm4AbavfvAGPJL8qmUnusCeS/JnVid7Fzzp0bU4o6q8L18FXtZK',
  0,
  'CHALLENGER',
  2000,
  1,
  1,
  0,
  5,
  'ADMIN001'
);

-- Create user_stats for admin
INSERT INTO user_stats (user_id) VALUES (LAST_INSERT_ID());

-- Verify admin account creation
SELECT id, username, email, points, tier, rating, is_admin, welcome_packs_remaining FROM users WHERE email = 'admin@berrple.com';
-- Admin logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  target_user_id INT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id),
  FOREIGN KEY (target_user_id) REFERENCES users(id),
  INDEX idx_admin_id (admin_id),
  INDEX idx_target_user_id (target_user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 코치 시스템

-- 코치 테이블
CREATE TABLE IF NOT EXISTS coaches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    star_rating INT NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
    buff_type ENUM('OVERALL', 'POSITION', 'TEAM', 'STRATEGY') NOT NULL,
    buff_value INT NOT NULL,
    buff_target VARCHAR(50), -- POSITION: 'TOP', 'JUN', 'MID', 'ADC', 'SUP', TEAM: 'T1', 'DK' etc
    description TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 유저 코치 소유 테이블
CREATE TABLE IF NOT EXISTS user_coaches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    coach_id INT NOT NULL,
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_coach_id (coach_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 코치 데이터 삽입 (한국 이름, 30명, 1~5성)
INSERT INTO coaches (name, star_rating, buff_type, buff_value, buff_target, description) VALUES
-- 5성 코치 (3명)
('김철수', 5, 'OVERALL', 10, NULL, '전체 선수 오버롤 +10'),
('이영희', 5, 'TEAM', 15, 'T1', 'T1 팀 선수 오버롤 +15'),
('박민수', 5, 'STRATEGY', 20, NULL, '전략 승률 +20%'),

-- 4성 코치 (7명)
('최동욱', 4, 'OVERALL', 7, NULL, '전체 선수 오버롤 +7'),
('정수진', 4, 'POSITION', 12, 'MID', '미드 선수 오버롤 +12'),
('강태양', 4, 'POSITION', 12, 'ADC', 'ADC 선수 오버롤 +12'),
('송지훈', 4, 'TEAM', 12, 'DK', 'DK 팀 선수 오버롤 +12'),
('윤서연', 4, 'POSITION', 12, 'JUN', '정글 선수 오버롤 +12'),
('한민재', 4, 'TEAM', 12, 'GEN', 'GEN 팀 선수 오버롤 +12'),
('오상민', 4, 'STRATEGY', 15, NULL, '전략 승률 +15%'),

-- 3성 코치 (10명)
('배준호', 3, 'OVERALL', 5, NULL, '전체 선수 오버롤 +5'),
('임지우', 3, 'POSITION', 8, 'TOP', '탑 선수 오버롤 +8'),
('서하늘', 3, 'POSITION', 8, 'SUP', '서포터 선수 오버롤 +8'),
('노현우', 3, 'TEAM', 8, 'HLE', 'HLE 팀 선수 오버롤 +8'),
('황다은', 3, 'POSITION', 8, 'MID', '미드 선수 오버롤 +8'),
('안재민', 3, 'TEAM', 8, 'KT', 'KT 팀 선수 오버롤 +8'),
('문소희', 3, 'POSITION', 8, 'ADC', 'ADC 선수 오버롤 +8'),
('신동혁', 3, 'TEAM', 8, 'LSB', 'LSB 팀 선수 오버롤 +8'),
('류지성', 3, 'STRATEGY', 10, NULL, '전략 승률 +10%'),
('곽은비', 3, 'POSITION', 8, 'JUN', '정글 선수 오버롤 +8'),

-- 2성 코치 (7명)
('진수아', 2, 'OVERALL', 3, NULL, '전체 선수 오버롤 +3'),
('허준영', 2, 'POSITION', 5, 'TOP', '탑 선수 오버롤 +5'),
('남궁민', 2, 'POSITION', 5, 'MID', '미드 선수 오버롤 +5'),
('전하린', 2, 'TEAM', 5, 'NS', 'NS 팀 선수 오버롤 +5'),
('표정우', 2, 'POSITION', 5, 'SUP', '서포터 선수 오버롤 +5'),
('권나영', 2, 'STRATEGY', 7, NULL, '전략 승률 +7%'),
('홍석진', 2, 'POSITION', 5, 'ADC', 'ADC 선수 오버롤 +5'),

-- 1성 코치 (3명)
('구민호', 1, 'OVERALL', 1, NULL, '전체 선수 오버롤 +1'),
('설아름', 1, 'POSITION', 3, 'JUN', '정글 선수 오버롤 +3'),
('탁준서', 1, 'STRATEGY', 3, NULL, '전략 승률 +3%');
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
-- 쿠폰 시스템 테이블 생성

-- 쿠폰 테이블
CREATE TABLE IF NOT EXISTS coupons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  type ENUM('POINTS', 'CARD', 'PACK') NOT NULL,
  reward_value INT NULL,  -- POINTS일 때 포인트 양
  reward_player_id INT NULL,  -- CARD일 때 플레이어 ID
  reward_pack_type VARCHAR(20) NULL,  -- PACK일 때 팩 종류
  reward_pack_count INT DEFAULT 1,  -- PACK일 때 팩 개수
  max_uses INT DEFAULT 1,  -- 최대 사용 횟수 (1 = 1회용, NULL = 무제한)
  current_uses INT DEFAULT 0,  -- 현재 사용된 횟수
  expires_at DATETIME NULL,  -- 만료 시간
  created_by INT NOT NULL,  -- 생성한 관리자 ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  description VARCHAR(255) NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (reward_player_id) REFERENCES players(id)
);

-- 쿠폰 사용 이력 테이블
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  coupon_id INT NOT NULL,
  user_id INT NOT NULL,
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reward_type ENUM('POINTS', 'CARD', 'PACK') NOT NULL,
  reward_details TEXT NULL,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_user_coupon (user_id, coupon_id)  -- 사용자당 1회만 사용 가능
);

-- 인덱스 추가
CREATE INDEX idx_coupon_code ON coupons(code);
CREATE INDEX idx_coupon_active ON coupons(is_active);
CREATE INDEX idx_redemption_user ON coupon_redemptions(user_id);
CREATE INDEX idx_redemption_coupon ON coupon_redemptions(coupon_id);
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
-- Gacha mileage system table
CREATE TABLE IF NOT EXISTS gacha_mileage (
    user_id INT PRIMARY KEY,
    mileage_points INT NOT NULL DEFAULT 0,
    last_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mileage reward claim history
CREATE TABLE IF NOT EXISTS gacha_mileage_claims (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    milestone INT NOT NULL,
    reward_type VARCHAR(50) NOT NULL COMMENT 'POINTS, PACK',
    reward_value INT NOT NULL,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_milestone (user_id, milestone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
-- 선수별 시장 가격 테이블
CREATE TABLE IF NOT EXISTS player_market_prices (
  player_id INT PRIMARY KEY,
  base_price INT NOT NULL,           -- 기본 가격 (티어별 기준)
  current_price INT NOT NULL,        -- 현재 시세
  price_floor INT NOT NULL,          -- 하한가 (base_price - 100)
  price_ceiling INT NOT NULL,        -- 상한가 (base_price + 100)
  total_volume INT DEFAULT 0,        -- 총 거래량
  last_traded_price INT,             -- 마지막 거래가
  last_traded_at TIMESTAMP,          -- 마지막 거래 시간
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- 시장 거래 내역 테이블
CREATE TABLE IF NOT EXISTS market_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  player_id INT NOT NULL,
  seller_id INT NOT NULL,
  buyer_id INT,                      -- NULL = 아직 판매되지 않음
  card_id INT NOT NULL,              -- 거래되는 카드 ID
  listing_price INT NOT NULL,        -- 등록 가격
  sold_price INT,                    -- 실제 판매가 (판매되면 기록)
  status ENUM('LISTED', 'SOLD', 'CANCELLED') DEFAULT 'LISTED',
  listed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sold_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES user_cards(id) ON DELETE CASCADE
);

-- 가격 변동 히스토리 테이블
CREATE TABLE IF NOT EXISTS price_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  player_id INT NOT NULL,
  price INT NOT NULL,
  transaction_id INT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES market_transactions(id) ON DELETE SET NULL
);

-- 모든 선수에 대해 기본 가격 설정
INSERT INTO player_market_prices (player_id, base_price, current_price, price_floor, price_ceiling)
SELECT
  id,
  CASE
    WHEN tier = 'ICON' THEN 5000
    WHEN tier = 'LEGENDARY' THEN 2000
    WHEN tier = 'EPIC' THEN 1000
    WHEN tier = 'RARE' THEN 500
    WHEN tier = 'COMMON' THEN 300
    ELSE 300
  END as base_price,
  CASE
    WHEN tier = 'ICON' THEN 5000
    WHEN tier = 'LEGENDARY' THEN 2000
    WHEN tier = 'EPIC' THEN 1000
    WHEN tier = 'RARE' THEN 500
    WHEN tier = 'COMMON' THEN 300
    ELSE 300
  END as current_price,
  CASE
    WHEN tier = 'ICON' THEN 4500
    WHEN tier = 'LEGENDARY' THEN 1900
    WHEN tier = 'EPIC' THEN 900
    WHEN tier = 'RARE' THEN 400
    WHEN tier = 'COMMON' THEN 200
    ELSE 200
  END as price_floor,
  CASE
    WHEN tier = 'ICON' THEN 5500
    WHEN tier = 'LEGENDARY' THEN 2100
    WHEN tier = 'EPIC' THEN 1100
    WHEN tier = 'RARE' THEN 600
    WHEN tier = 'COMMON' THEN 400
    ELSE 400
  END as price_ceiling
FROM players
WHERE id NOT IN (SELECT player_id FROM player_market_prices);

-- 인덱스 생성
CREATE INDEX idx_market_transactions_status ON market_transactions(status);
CREATE INDEX idx_market_transactions_player ON market_transactions(player_id);
CREATE INDEX idx_market_transactions_seller ON market_transactions(seller_id);
CREATE INDEX idx_price_history_player ON price_history(player_id);
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
-- Create notices table
CREATE TABLE IF NOT EXISTS notices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type ENUM('NOTICE', 'EVENT', 'PATCH', 'UPDATE', 'MAINTENANCE') DEFAULT 'NOTICE',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_is_pinned (is_pinned),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Clear existing traits
TRUNCATE TABLE player_traits;

-- T1 Players (25WW)
INSERT INTO player_traits (player_id, name, description, effect, trait_type, stat_affected, value_change) VALUES
((SELECT id FROM players WHERE name = '25WW Doran'), '세계 챔피언', '월즈 우승 경험', '+10% 전체 스탯', 'BUFF', 'overall', 10),
((SELECT id FROM players WHERE name = '25WW Doran'), '압박에 강함', '중요한 순간에 강함', '+15 멘탈', 'BUFF', 'mental', 15),
((SELECT id FROM players WHERE name = '25WW Oner'), '정글 지배자', '정글 장악력', '+12 운영', 'BUFF', 'macro', 12),
((SELECT id FROM players WHERE name = '25WW Oner'), '완벽한 타이밍', '갱킹 타이밍', '+10 한타', 'BUFF', 'teamfight', 10),
((SELECT id FROM players WHERE name = '25WW Faker'), 'GOAT', '역대 최고의 선수', '+15% 전체 스탯', 'BUFF', 'overall', 15),
((SELECT id FROM players WHERE name = '25WW Faker'), '불굴의 정신', '절대 포기하지 않음', '+20 멘탈', 'BUFF', 'mental', 20),
((SELECT id FROM players WHERE name = '25WW Faker'), '신의 한 수', '클러치 플레이', '+15 한타', 'BUFF', 'teamfight', 15),
((SELECT id FROM players WHERE name = '25WW Gumayusi'), '완벽한 포지셔닝', '한타 포지셔닝', '+15 한타', 'BUFF', 'teamfight', 15),
((SELECT id FROM players WHERE name = '25WW Gumayusi'), '공격적 성향', '과감한 플레이', '+10 라인전', 'BUFF', 'laning', 10),
((SELECT id FROM players WHERE name = '25WW Gumayusi'), '가끔 실수', '간혹 위험한 플레이', '-5 멘탈', 'NERF', 'mental', -5),
((SELECT id FROM players WHERE name = '25WW Keria'), '로밍 마스터', '완벽한 로밍', '+15 운영', 'BUFF', 'macro', 15),
((SELECT id FROM players WHERE name = '25WW Keria'), '시야 장악', '완벽한 시야 관리', '+12 운영', 'BUFF', 'macro', 12),
((SELECT id FROM players WHERE name = '25WW Keria'), '공격적 서포터', '적극적인 플레이', '+10 한타', 'BUFF', 'teamfight', 10);

-- KT Players (25WUD)
INSERT INTO player_traits (player_id, name, description, effect, trait_type, stat_affected, value_change) VALUES
((SELECT id FROM players WHERE name = '25WUD PerfecT'), '언더독 정신', '약자의 투혼', '+10 멘탈', 'BUFF', 'mental', 10),
((SELECT id FROM players WHERE name = '25WUD PerfecT'), '안정적 라이너', '실수가 적음', '+8 라인전', 'BUFF', 'laning', 8),
((SELECT id FROM players WHERE name = '25WUD PerfecT'), '소극적 플레이', '신중한 성향', '-5 한타', 'NERF', 'teamfight', -5),
((SELECT id FROM players WHERE name = '25WUD Cuzz'), '베테랑 경험', '풍부한 경험', '+10 운영', 'BUFF', 'macro', 10),
((SELECT id FROM players WHERE name = '25WUD Cuzz'), '초반 약세', '초반 압박에 약함', '-8 라인전', 'NERF', 'laning', -8),
((SELECT id FROM players WHERE name = '25WUD Cuzz'), '후반 캐리', '후반 플레이 강화', '+12 한타', 'BUFF', 'teamfight', 12),
((SELECT id FROM players WHERE name = '25WUD Peter'), '침착함', '냉정한 판단', '+12 멘탈', 'BUFF', 'mental', 12),
((SELECT id FROM players WHERE name = '25WUD Peter'), '서포팅 능력', '팀원 지원', '+10 한타', 'BUFF', 'teamfight', 10);

-- CFO Players (25WUD)
INSERT INTO player_traits (player_id, name, description, effect, trait_type, stat_affected, value_change) VALUES
((SELECT id FROM players WHERE name = '25WUD HongQ'), '천재적 센스', '뛰어난 게임 이해도', '+12 운영', 'BUFF', 'macro', 12),
((SELECT id FROM players WHERE name = '25WUD HongQ'), '불안정함', '기복이 심함', '-10 멘탈', 'NERF', 'mental', -10),
((SELECT id FROM players WHERE name = '25WUD HongQ'), '압도적 라인전', '1:1 강함', '+15 라인전', 'BUFF', 'laning', 15),
((SELECT id FROM players WHERE name = '25WUD Doggo'), '딜링 머신', '꾸준한 딜량', '+12 한타', 'BUFF', 'teamfight', 12),
((SELECT id FROM players WHERE name = '25WUD Doggo'), '안정적 성향', '실수 최소화', '+8 멘탈', 'BUFF', 'mental', 8),
((SELECT id FROM players WHERE name = '25WUD Doggo'), '운영 부족', '맵 리딩 약함', '-8 운영', 'NERF', 'macro', -8);

-- LCK REWIND Players (RE)
INSERT INTO player_traits (player_id, name, description, effect, trait_type, stat_affected, value_change) VALUES
((SELECT id FROM players WHERE name = 'RE MaKNooN'), '레전드의 귀환', '전성기 회복', '+10 전체', 'BUFF', 'overall', 10),
((SELECT id FROM players WHERE name = 'RE MaKNooN'), '캐리 성향', '팀을 이끄는 플레이', '+12 한타', 'BUFF', 'teamfight', 12),
((SELECT id FROM players WHERE name = 'RE Ambition'), '완벽한 정글링', '정글 장악', '+15 운영', 'BUFF', 'macro', 15),
((SELECT id FROM players WHERE name = 'RE Ambition'), '냉철한 판단', '정확한 결정', '+12 멘탈', 'BUFF', 'mental', 12),
((SELECT id FROM players WHERE name = 'RE Dade'), '압도적 라인전', '라인 킬 특화', '+18 라인전', 'BUFF', 'laning', 18),
((SELECT id FROM players WHERE name = 'RE Dade'), '대회 징크스', '중요한 대회에서 약함', '-15 멘탈', 'NERF', 'mental', -15),
((SELECT id FROM players WHERE name = 'RE Dade'), '솔로 캐리', '혼자서도 캐리', '+10 한타', 'BUFF', 'teamfight', 10),
((SELECT id FROM players WHERE name = 'RE PraY'), '완벽한 포지셔닝', '죽지 않는 딜러', '+15 한타', 'BUFF', 'teamfight', 15),
((SELECT id FROM players WHERE name = 'RE PraY'), '클러치 유전자', '중요한 순간 강함', '+15 멘탈', 'BUFF', 'mental', 15),
((SELECT id FROM players WHERE name = 'RE MadLife'), '신의 손', '완벽한 스킬샷', '+20 한타', 'BUFF', 'teamfight', 20),
((SELECT id FROM players WHERE name = 'RE MadLife'), '시야 장악', '완벽한 와드', '+18 운영', 'BUFF', 'macro', 18),
((SELECT id FROM players WHERE name = 'RE MadLife'), '레전드 서포터', '역대급 실력', '+15 전체', 'BUFF', 'overall', 15),
((SELECT id FROM players WHERE name = 'RE Flame'), '완벽한 라이너', '라인전 지배자', '+20 라인전', 'BUFF', 'laning', 20),
((SELECT id FROM players WHERE name = 'RE Flame'), '1:1 최강', '듀얼 특화', '+12 라인전', 'BUFF', 'laning', 12),
((SELECT id FROM players WHERE name = 'RE Flame'), '팀플 부족', '개인 플레이 선호', '-10 한타', 'NERF', 'teamfight', -10),
((SELECT id FROM players WHERE name = 'RE Score'), '완벽한 파밍', '끊임없는 성장', '+15 운영', 'BUFF', 'macro', 15),
((SELECT id FROM players WHERE name = 'RE Score'), '안정적 플레이', '실수 없음', '+12 멘탈', 'BUFF', 'mental', 12),
((SELECT id FROM players WHERE name = 'RE Score'), '우승 경험 부족', '결승 약세', '-8 멘탈', 'NERF', 'mental', -8),
((SELECT id FROM players WHERE name = 'RE Faker'), '불멸의 악마왕', '절대자', '+25 전체', 'BUFF', 'overall', 25),
((SELECT id FROM players WHERE name = 'RE Faker'), '완벽한 멘탈', '절대 흔들리지 않음', '+25 멘탈', 'BUFF', 'mental', 25),
((SELECT id FROM players WHERE name = 'RE Faker'), '극한의 캐리', '1대9 가능', '+20 한타', 'BUFF', 'teamfight', 20),
((SELECT id FROM players WHERE name = 'RE Bang'), '안정적 딜러', '꾸준한 딜링', '+15 한타', 'BUFF', 'teamfight', 15),
((SELECT id FROM players WHERE name = 'RE Bang'), '완벽한 라인전', '안정적 성장', '+12 라인전', 'BUFF', 'laning', 12),
((SELECT id FROM players WHERE name = 'RE Bang'), '압박 약세', '중요한 순간 실수', '-10 멘탈', 'NERF', 'mental', -10),
((SELECT id FROM players WHERE name = 'RE Wolf'), '완벽한 호흡', '팀워크 극대화', '+15 운영', 'BUFF', 'macro', 15),
((SELECT id FROM players WHERE name = 'RE Wolf'), '로밍 특화', '맵 장악', '+12 운영', 'BUFF', 'macro', 12),
((SELECT id FROM players WHERE name = 'RE Bengi'), '정글의 신', '완벽한 정글링', '+18 운영', 'BUFF', 'macro', 18),
((SELECT id FROM players WHERE name = 'RE Bengi'), 'Faker의 그림자', '미드와 완벽한 시너지', '+15 한타', 'BUFF', 'teamfight', 15),
((SELECT id FROM players WHERE name = 'RE Bengi'), '라인전 부족', '개인 능력 약함', '-12 라인전', 'NERF', 'laning', -12),
((SELECT id FROM players WHERE name = 'RE Duke'), '탱커 장인', '탱킹 특화', '+15 한타', 'BUFF', 'teamfight', 15),
((SELECT id FROM players WHERE name = 'RE Duke'), '안정적 운영', '실수 최소화', '+12 운영', 'BUFF', 'macro', 12),
((SELECT id FROM players WHERE name = 'RE Duke'), '캐리력 부족', '딜러 챔프 약함', '-10 라인전', 'NERF', 'laning', -10),
((SELECT id FROM players WHERE name = 'RE Smeb'), '완벽한 탑라이너', '모든 면에서 최고', '+20 전체', 'BUFF', 'overall', 20),
((SELECT id FROM players WHERE name = 'RE Smeb'), '캐리 머신', '팀을 이끄는 플레이', '+18 한타', 'BUFF', 'teamfight', 18),
((SELECT id FROM players WHERE name = 'RE Smeb'), '압도적 라인전', '라인전 최강자', '+20 라인전', 'BUFF', 'laning', 20),
((SELECT id FROM players WHERE name = 'RE Peanut'), '공격적 정글', '압박 플레이', '+15 라인전', 'BUFF', 'laning', 15),
((SELECT id FROM players WHERE name = 'RE Peanut'), '초반 강자', '초반 갱킹 특화', '+12 라인전', 'BUFF', 'laning', 12),
((SELECT id FROM players WHERE name = 'RE Peanut'), '후반 약세', '후반 영향력 감소', '-10 한타', 'NERF', 'teamfight', -10);

-- Add more generic traits for common players (선택된 일부 선수들에게만 추가)
-- This is just a sample, you can add more as needed
-- 전략 밸런스 시스템

-- 1. 전략 밸런스 테이블 (각 전략의 현재 밸런스 수치)
CREATE TABLE IF NOT EXISTS strategy_balance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    strategy_type ENUM('LANING', 'TEAMFIGHT', 'MACRO') NOT NULL,
    strategy_name VARCHAR(50) NOT NULL,
    balance_modifier DECIMAL(4,3) DEFAULT 1.000, -- 1.000 = 기본, 1.100 = 10% 버프, 0.900 = 10% 너프
    usage_count INT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    last_balanced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_strategy (strategy_type, strategy_name),
    INDEX idx_strategy_type (strategy_type),
    INDEX idx_usage_count (usage_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 전략 밸런스 히스토리 (밸런스 변경 기록)
CREATE TABLE IF NOT EXISTS strategy_balance_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    strategy_type ENUM('LANING', 'TEAMFIGHT', 'MACRO') NOT NULL,
    strategy_name VARCHAR(50) NOT NULL,
    old_modifier DECIMAL(4,3) NOT NULL,
    new_modifier DECIMAL(4,3) NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_strategy (strategy_type, strategy_name),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 초기 전략 데이터 삽입
INSERT INTO strategy_balance (strategy_type, strategy_name, balance_modifier) VALUES
-- Laning Strategies
('LANING', 'AGGRESSIVE', 1.000),
('LANING', 'SAFE', 1.000),
('LANING', 'ROAMING', 1.000),
('LANING', 'SCALING', 1.000),
('LANING', 'PUSH', 1.000),
('LANING', 'FREEZE', 1.000),
('LANING', 'TRADE', 1.000),
('LANING', 'ALLKILL', 1.000),
-- Teamfight Strategies
('TEAMFIGHT', 'ENGAGE', 1.000),
('TEAMFIGHT', 'DISENGAGE', 1.000),
('TEAMFIGHT', 'POKE', 1.000),
('TEAMFIGHT', 'PROTECT', 1.000),
('TEAMFIGHT', 'SPLIT', 1.000),
('TEAMFIGHT', 'FLANK', 1.000),
('TEAMFIGHT', 'KITE', 1.000),
('TEAMFIGHT', 'DIVE', 1.000),
-- Macro Strategies
('MACRO', 'OBJECTIVE', 1.000),
('MACRO', 'VISION', 1.000),
('MACRO', 'SPLITPUSH', 1.000),
('MACRO', 'GROUPING', 1.000),
('MACRO', 'PICK', 1.000),
('MACRO', 'SIEGE', 1.000),
('MACRO', 'ROTATION', 1.000),
('MACRO', 'CONTROL', 1.000)
ON DUPLICATE KEY UPDATE balance_modifier = balance_modifier;
-- Create suggestions table for user feedback

CREATE TABLE IF NOT EXISTS suggestions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category ENUM('BUG', 'FEATURE', 'BALANCE', 'UI', 'OTHER') DEFAULT 'OTHER',
    status ENUM('PENDING', 'REVIEWING', 'ACCEPTED', 'REJECTED', 'COMPLETED') DEFAULT 'PENDING',
    admin_reply TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table creation
DESCRIBE suggestions;
-- 유저 팩 인벤토리 테이블 생성
CREATE TABLE IF NOT EXISTS user_packs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    pack_type VARCHAR(50) NOT NULL COMMENT 'STANDARD, PREMIUM, LEGENDARY, etc.',
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_pack_type (pack_type),
    UNIQUE KEY unique_user_pack_type (user_id, pack_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
-- VS 모드 시즌 2: 50단계 (난이도별 보상 체계)

-- 기존 데이터 삭제
DELETE FROM vs_stage_enemies;
DELETE FROM vs_stages;
DELETE FROM user_vs_progress;

-- 시즌 2 스테이지 생성 (50단계)
-- 하드모드: 보상 4배, 강화 레벨 대폭 증가
-- 1~11단계: 쉬움 - 300P (하드 1200P)
INSERT INTO vs_stages (stage_number, stage_name, is_boss, reward_points, hard_mode_multiplier) VALUES
(1, '1단계 - 신인 도전', FALSE, 300, 4),
(2, '2단계 - 루키 리그', FALSE, 300, 4),
(3, '3단계 - 성장하는 재능', FALSE, 300, 4),
(4, '4단계 - 도약의 시작', FALSE, 300, 4),
(5, '5단계 - 연습생 탈출', FALSE, 300, 4),
(6, '6단계 - 챌린저스 무대', FALSE, 300, 4),
(7, '7단계 - 첫 승리', FALSE, 300, 4),
(8, '8단계 - 팀워크 훈련', FALSE, 300, 4),
(9, '9단계 - 기본기 마스터', FALSE, 300, 4),
(10, '10단계 - 프로 입문', FALSE, 300, 4),
(11, '11단계 - 쉬움 완료', TRUE, 300, 4),

-- 12~22단계: 보통 - 1000P (하드 4000P)
(12, '12단계 - 프로 데뷔', FALSE, 1000, 4),
(13, '13단계 - 첫 정규리그', FALSE, 1000, 4),
(14, '14단계 - 중위권 팀', FALSE, 1000, 4),
(15, '15단계 - 스타팅 라인업', FALSE, 1000, 4),
(16, '16단계 - 팀 핵심', FALSE, 1000, 4),
(17, '17단계 - 플레이오프 진출', FALSE, 1000, 4),
(18, '18단계 - 전술 마스터', FALSE, 1000, 4),
(19, '19단계 - 강팀 도전', FALSE, 1000, 4),
(20, '20단계 - 시너지 각성', FALSE, 1000, 4),
(21, '21단계 - 명성 상승', FALSE, 1000, 4),
(22, '22단계 - 보통 완료', TRUE, 1000, 4),

-- 23~33단계: 어려움 - 2500P (하드 10000P)
(23, '23단계 - 강호 진입', FALSE, 2500, 4),
(24, '24단계 - 상위권 경쟁', FALSE, 2500, 4),
(25, '25단계 - 우승 후보', FALSE, 2500, 4),
(26, '26단계 - 리그 최강', FALSE, 2500, 4),
(27, '27단계 - 결승 진출', FALSE, 2500, 4),
(28, '28단계 - 챔피언 도전', FALSE, 2500, 4),
(29, '29단계 - 스타 플레이어', FALSE, 2500, 4),
(30, '30단계 - 에이스 등극', FALSE, 2500, 4),
(31, '31단계 - 전설의 시작', FALSE, 2500, 4),
(32, '32단계 - 국제 무대', FALSE, 2500, 4),
(33, '33단계 - 어려움 완료', TRUE, 2500, 4),

-- 34~49단계: 지옥 - 10000P (하드 40000P)
(34, '34단계 - 지옥문 입장', FALSE, 10000, 4),
(35, '35단계 - 세계 랭커', FALSE, 10000, 4),
(36, '36단계 - MSI 도전', FALSE, 10000, 4),
(37, '37단계 - 월드 챔피언십', FALSE, 10000, 4),
(38, '38단계 - 전설의 대결', FALSE, 10000, 4),
(39, '39단계 - 역대급 매치업', FALSE, 10000, 4),
(40, '40단계 - 신의 경지', FALSE, 10000, 4),
(41, '41단계 - 초월자', FALSE, 10000, 4),
(42, '42단계 - 불멸의 전설', FALSE, 10000, 4),
(43, '43단계 - 올타임 레전드', FALSE, 10000, 4),
(44, '44단계 - 역사를 쓰다', FALSE, 10000, 4),
(45, '45단계 - 시대의 지배자', FALSE, 10000, 4),
(46, '46단계 - 완벽한 게임', FALSE, 10000, 4),
(47, '47단계 - 신화 창조', FALSE, 10000, 4),
(48, '48단계 - 최종 관문', FALSE, 10000, 4),
(49, '49단계 - 지옥 완료', TRUE, 10000, 4),

-- 50단계: 최종 보스 - ICON 10강 - 30000P (하드 120000P)
(50, '50단계 - 궁극의 도전: ICON 10강', TRUE, 30000, 4);

-- ============================================
-- 적 팀 구성
-- ============================================

-- 1~11단계: 쉬움 (LCP/LTA 선수, 강화 0, 하드 3강)
-- Stage 1: LCP 신인팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Pun', 0, 3, 1 FROM vs_stages WHERE stage_number = 1
UNION ALL SELECT id, 'Hizto', 0, 3, 2 FROM vs_stages WHERE stage_number = 1
UNION ALL SELECT id, 'Dire', 0, 3, 3 FROM vs_stages WHERE stage_number = 1
UNION ALL SELECT id, 'Eddie', 0, 3, 4 FROM vs_stages WHERE stage_number = 1
UNION ALL SELECT id, 'Taki', 0, 3, 5 FROM vs_stages WHERE stage_number = 1;

-- Stage 2: LCP 혼성팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Azhi', 0, 3, 1 FROM vs_stages WHERE stage_number = 2
UNION ALL SELECT id, 'JunJia', 0, 3, 2 FROM vs_stages WHERE stage_number = 2
UNION ALL SELECT id, 'HongQ', 0, 3, 3 FROM vs_stages WHERE stage_number = 2
UNION ALL SELECT id, 'Betty', 0, 3, 4 FROM vs_stages WHERE stage_number = 2
UNION ALL SELECT id, 'Woody', 0, 3, 5 FROM vs_stages WHERE stage_number = 2;

-- Stage 3: LTA 혼성팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Jojo', 0, 3, 1 FROM vs_stages WHERE stage_number = 3
UNION ALL SELECT id, 'Bugi', 0, 3, 2 FROM vs_stages WHERE stage_number = 3
UNION ALL SELECT id, 'Evi', 0, 3, 3 FROM vs_stages WHERE stage_number = 3
UNION ALL SELECT id, 'Yutapon', 0, 3, 4 FROM vs_stages WHERE stage_number = 3
UNION ALL SELECT id, 'Vsta', 0, 3, 5 FROM vs_stages WHERE stage_number = 3;

-- Stage 4: LCP 중위권팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Rest', 0, 3, 1 FROM vs_stages WHERE stage_number = 4
UNION ALL SELECT id, 'Karsa', 0, 3, 2 FROM vs_stages WHERE stage_number = 4
UNION ALL SELECT id, 'Maple', 0, 3, 3 FROM vs_stages WHERE stage_number = 4
UNION ALL SELECT id, 'Doggo', 0, 3, 4 FROM vs_stages WHERE stage_number = 4
UNION ALL SELECT id, 'Kaiwing', 0, 3, 5 FROM vs_stages WHERE stage_number = 4;

-- Stage 5: LTA 중위권팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Evi', 0, 3, 1 FROM vs_stages WHERE stage_number = 5
UNION ALL SELECT id, 'Steal', 0, 3, 2 FROM vs_stages WHERE stage_number = 5
UNION ALL SELECT id, 'Ceros', 0, 3, 3 FROM vs_stages WHERE stage_number = 5
UNION ALL SELECT id, 'Yutapon', 0, 3, 4 FROM vs_stages WHERE stage_number = 5
UNION ALL SELECT id, 'Harp', 0, 3, 5 FROM vs_stages WHERE stage_number = 5;

-- Stage 6: LCP/LTA 혼성
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Jojo', 0, 3, 1 FROM vs_stages WHERE stage_number = 6
UNION ALL SELECT id, 'Karsa', 0, 3, 2 FROM vs_stages WHERE stage_number = 6
UNION ALL SELECT id, 'Maple', 0, 3, 3 FROM vs_stages WHERE stage_number = 6
UNION ALL SELECT id, 'Doggo', 0, 3, 4 FROM vs_stages WHERE stage_number = 6
UNION ALL SELECT id, 'Vsta', 0, 3, 5 FROM vs_stages WHERE stage_number = 6;

-- Stage 7: LCP 강팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Rest', 0, 3, 1 FROM vs_stages WHERE stage_number = 7
UNION ALL SELECT id, 'JunJia', 0, 3, 2 FROM vs_stages WHERE stage_number = 7
UNION ALL SELECT id, 'Maple', 0, 3, 3 FROM vs_stages WHERE stage_number = 7
UNION ALL SELECT id, 'Doggo', 0, 3, 4 FROM vs_stages WHERE stage_number = 7
UNION ALL SELECT id, 'Kaiwing', 0, 3, 5 FROM vs_stages WHERE stage_number = 7;

-- Stage 8: LTA 강팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Evi', 0, 3, 1 FROM vs_stages WHERE stage_number = 8
UNION ALL SELECT id, 'Steal', 0, 3, 2 FROM vs_stages WHERE stage_number = 8
UNION ALL SELECT id, 'Ceros', 0, 3, 3 FROM vs_stages WHERE stage_number = 8
UNION ALL SELECT id, 'Yutapon', 0, 3, 4 FROM vs_stages WHERE stage_number = 8
UNION ALL SELECT id, 'Harp', 0, 3, 5 FROM vs_stages WHERE stage_number = 8;

-- Stage 9: LCP 올스타
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Rest', 0, 3, 1 FROM vs_stages WHERE stage_number = 9
UNION ALL SELECT id, 'Karsa', 0, 3, 2 FROM vs_stages WHERE stage_number = 9
UNION ALL SELECT id, 'Maple', 0, 3, 3 FROM vs_stages WHERE stage_number = 9
UNION ALL SELECT id, 'Doggo', 0, 3, 4 FROM vs_stages WHERE stage_number = 9
UNION ALL SELECT id, 'Kaiwing', 0, 3, 5 FROM vs_stages WHERE stage_number = 9;

-- Stage 10: LTA 올스타
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Jojo', 0, 3, 1 FROM vs_stages WHERE stage_number = 10
UNION ALL SELECT id, 'Steal', 0, 3, 2 FROM vs_stages WHERE stage_number = 10
UNION ALL SELECT id, 'Ceros', 0, 3, 3 FROM vs_stages WHERE stage_number = 10
UNION ALL SELECT id, 'Yutapon', 0, 3, 4 FROM vs_stages WHERE stage_number = 10
UNION ALL SELECT id, 'Harp', 0, 3, 5 FROM vs_stages WHERE stage_number = 10;

-- Stage 11: LCP/LTA 드림팀 (보스)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Jojo', 1, 4, 1 FROM vs_stages WHERE stage_number = 11
UNION ALL SELECT id, 'Karsa', 1, 4, 2 FROM vs_stages WHERE stage_number = 11
UNION ALL SELECT id, 'Maple', 1, 4, 3 FROM vs_stages WHERE stage_number = 11
UNION ALL SELECT id, 'Doggo', 1, 4, 4 FROM vs_stages WHERE stage_number = 11
UNION ALL SELECT id, 'Vsta', 1, 4, 5 FROM vs_stages WHERE stage_number = 11;

-- 12~22단계: 보통 (LPL/LCK/LEC, 강화 1~2)
-- Stage 12: LCK 하위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'DuDu', 1, 4, 1 FROM vs_stages WHERE stage_number = 12
UNION ALL SELECT id, 'Pyosik', 1, 4, 2 FROM vs_stages WHERE stage_number = 12
UNION ALL SELECT id, 'BuLLDoG', 1, 4, 3 FROM vs_stages WHERE stage_number = 12
UNION ALL SELECT id, 'Berserker', 1, 4, 4 FROM vs_stages WHERE stage_number = 12
UNION ALL SELECT id, 'Life', 1, 4, 5 FROM vs_stages WHERE stage_number = 12;

-- Stage 13: LEC 하위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Oscarinin', 1, 4, 1 FROM vs_stages WHERE stage_number = 13
UNION ALL SELECT id, 'Jankos', 1, 4, 2 FROM vs_stages WHERE stage_number = 13
UNION ALL SELECT id, 'Caps', 1, 4, 3 FROM vs_stages WHERE stage_number = 13
UNION ALL SELECT id, 'Rekkles', 1, 4, 4 FROM vs_stages WHERE stage_number = 13
UNION ALL SELECT id, 'Mikyx', 1, 4, 5 FROM vs_stages WHERE stage_number = 13;

-- Stage 14: LPL 하위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Breathe', 1, 4, 1 FROM vs_stages WHERE stage_number = 14
UNION ALL SELECT id, 'Weiwei', 1, 4, 2 FROM vs_stages WHERE stage_number = 14
UNION ALL SELECT id, 'Scout', 1, 4, 3 FROM vs_stages WHERE stage_number = 14
UNION ALL SELECT id, 'Viper', 1, 4, 4 FROM vs_stages WHERE stage_number = 14
UNION ALL SELECT id, 'Meiko', 1, 4, 5 FROM vs_stages WHERE stage_number = 14;

-- Stage 15: LCK 중위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Rich', 1, 4, 1 FROM vs_stages WHERE stage_number = 15
UNION ALL SELECT id, 'Sponge', 1, 4, 2 FROM vs_stages WHERE stage_number = 15
UNION ALL SELECT id, 'Kyeahoo', 1, 4, 3 FROM vs_stages WHERE stage_number = 15
UNION ALL SELECT id, 'Teddy', 1, 4, 4 FROM vs_stages WHERE stage_number = 15
UNION ALL SELECT id, 'Andil', 1, 4, 5 FROM vs_stages WHERE stage_number = 15;

-- Stage 16: LEC 중위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Oscarinin', 1, 4, 1 FROM vs_stages WHERE stage_number = 16
UNION ALL SELECT id, 'Jankos', 1, 4, 2 FROM vs_stages WHERE stage_number = 16
UNION ALL SELECT id, 'Caps', 1, 4, 3 FROM vs_stages WHERE stage_number = 16
UNION ALL SELECT id, 'Rekkles', 1, 4, 4 FROM vs_stages WHERE stage_number = 16
UNION ALL SELECT id, 'Hylissang', 1, 4, 5 FROM vs_stages WHERE stage_number = 16;

-- Stage 17: LPL 중위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'TheShy', 1, 4, 1 FROM vs_stages WHERE stage_number = 17
UNION ALL SELECT id, 'Karsa', 1, 4, 2 FROM vs_stages WHERE stage_number = 17
UNION ALL SELECT id, 'Rookie', 1, 4, 3 FROM vs_stages WHERE stage_number = 17
UNION ALL SELECT id, 'JackeyLove', 1, 4, 4 FROM vs_stages WHERE stage_number = 17
UNION ALL SELECT id, 'Baolan', 1, 4, 5 FROM vs_stages WHERE stage_number = 17;

-- Stage 18: LCK 강팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kingen', 1, 4, 1 FROM vs_stages WHERE stage_number = 18
UNION ALL SELECT id, 'GIDEON', 1, 4, 2 FROM vs_stages WHERE stage_number = 18
UNION ALL SELECT id, 'Calix', 1, 4, 3 FROM vs_stages WHERE stage_number = 18
UNION ALL SELECT id, 'Jiwoo', 1, 4, 4 FROM vs_stages WHERE stage_number = 18
UNION ALL SELECT id, 'Lehends', 1, 4, 5 FROM vs_stages WHERE stage_number = 18;

-- Stage 19: LEC 강팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Wunder', 2, 5, 1 FROM vs_stages WHERE stage_number = 19
UNION ALL SELECT id, 'Jankos', 2, 5, 2 FROM vs_stages WHERE stage_number = 19
UNION ALL SELECT id, 'Caps', 2, 5, 3 FROM vs_stages WHERE stage_number = 19
UNION ALL SELECT id, 'Rekkles', 2, 5, 4 FROM vs_stages WHERE stage_number = 19
UNION ALL SELECT id, 'Mikyx', 2, 5, 5 FROM vs_stages WHERE stage_number = 19;

-- Stage 20: LPL 강팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Breathe', 2, 5, 1 FROM vs_stages WHERE stage_number = 20
UNION ALL SELECT id, 'Weiwei', 2, 5, 2 FROM vs_stages WHERE stage_number = 20
UNION ALL SELECT id, 'Scout', 2, 5, 3 FROM vs_stages WHERE stage_number = 20
UNION ALL SELECT id, 'Viper', 2, 5, 4 FROM vs_stages WHERE stage_number = 20
UNION ALL SELECT id, 'Meiko', 2, 5, 5 FROM vs_stages WHERE stage_number = 20;

-- Stage 21: LCK 상위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Siwoo', 2, 5, 1 FROM vs_stages WHERE stage_number = 21
UNION ALL SELECT id, 'Lucid', 2, 5, 2 FROM vs_stages WHERE stage_number = 21
UNION ALL SELECT id, 'ShowMaker', 2, 5, 3 FROM vs_stages WHERE stage_number = 21
UNION ALL SELECT id, 'Aiming', 2, 5, 4 FROM vs_stages WHERE stage_number = 21
UNION ALL SELECT id, 'BeryL', 2, 5, 5 FROM vs_stages WHERE stage_number = 21;

-- Stage 22: 국제 혼성팀 (보스)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'TheShy', 2, 5, 1 FROM vs_stages WHERE stage_number = 22
UNION ALL SELECT id, 'Weiwei', 2, 5, 2 FROM vs_stages WHERE stage_number = 22
UNION ALL SELECT id, 'Caps', 2, 5, 3 FROM vs_stages WHERE stage_number = 22
UNION ALL SELECT id, 'Viper', 2, 5, 4 FROM vs_stages WHERE stage_number = 22
UNION ALL SELECT id, 'Keria', 2, 5, 5 FROM vs_stages WHERE stage_number = 22;

-- 23~33단계: 어려움 (LPL/LCK/LEC, 강화 2~4)
-- Stage 23: LCK 최상위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Doran', 2, 4, 1 FROM vs_stages WHERE stage_number = 23
UNION ALL SELECT id, 'Peanut', 2, 4, 2 FROM vs_stages WHERE stage_number = 23
UNION ALL SELECT id, 'zeka', 2, 4, 3 FROM vs_stages WHERE stage_number = 23
UNION ALL SELECT id, 'Viper', 2, 4, 4 FROM vs_stages WHERE stage_number = 23
UNION ALL SELECT id, 'Delight', 2, 4, 5 FROM vs_stages WHERE stage_number = 23;

-- Stage 24: LPL 최상위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Breathe', 2, 4, 1 FROM vs_stages WHERE stage_number = 24
UNION ALL SELECT id, 'Weiwei', 2, 4, 2 FROM vs_stages WHERE stage_number = 24
UNION ALL SELECT id, 'Scout', 2, 4, 3 FROM vs_stages WHERE stage_number = 24
UNION ALL SELECT id, 'Viper', 2, 4, 4 FROM vs_stages WHERE stage_number = 24
UNION ALL SELECT id, 'Meiko', 2, 4, 5 FROM vs_stages WHERE stage_number = 24;

-- Stage 25: LEC 최상위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Wunder', 2, 4, 1 FROM vs_stages WHERE stage_number = 25
UNION ALL SELECT id, 'Jankos', 2, 4, 2 FROM vs_stages WHERE stage_number = 25
UNION ALL SELECT id, 'Caps', 2, 4, 3 FROM vs_stages WHERE stage_number = 25
UNION ALL SELECT id, 'Rekkles', 2, 4, 4 FROM vs_stages WHERE stage_number = 25
UNION ALL SELECT id, 'Hylissang', 2, 4, 5 FROM vs_stages WHERE stage_number = 25;

-- Stage 26: Gen.G
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 3, 7, 1 FROM vs_stages WHERE stage_number = 26
UNION ALL SELECT id, 'Canyon', 3, 7, 2 FROM vs_stages WHERE stage_number = 26
UNION ALL SELECT id, 'Chovy', 3, 7, 3 FROM vs_stages WHERE stage_number = 26
UNION ALL SELECT id, 'Ruler', 3, 7, 4 FROM vs_stages WHERE stage_number = 26
UNION ALL SELECT id, 'Duro', 3, 7, 5 FROM vs_stages WHERE stage_number = 26;

-- Stage 27: T1
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 3, 7, 1 FROM vs_stages WHERE stage_number = 27
UNION ALL SELECT id, 'Oner', 3, 7, 2 FROM vs_stages WHERE stage_number = 27
UNION ALL SELECT id, 'Faker', 3, 7, 3 FROM vs_stages WHERE stage_number = 27
UNION ALL SELECT id, 'Gumayusi', 3, 7, 4 FROM vs_stages WHERE stage_number = 27
UNION ALL SELECT id, 'Keria', 3, 7, 5 FROM vs_stages WHERE stage_number = 27;

-- Stage 28: LPL 챔피언
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Breathe', 3, 7, 1 FROM vs_stages WHERE stage_number = 28
UNION ALL SELECT id, 'Weiwei', 3, 7, 2 FROM vs_stages WHERE stage_number = 28
UNION ALL SELECT id, 'Scout', 3, 7, 3 FROM vs_stages WHERE stage_number = 28
UNION ALL SELECT id, 'Viper', 3, 7, 4 FROM vs_stages WHERE stage_number = 28
UNION ALL SELECT id, 'Meiko', 3, 7, 5 FROM vs_stages WHERE stage_number = 28;

-- Stage 29: LEC 챔피언
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Wunder', 3, 7, 1 FROM vs_stages WHERE stage_number = 29
UNION ALL SELECT id, 'Jankos', 3, 7, 2 FROM vs_stages WHERE stage_number = 29
UNION ALL SELECT id, 'Caps', 3, 7, 3 FROM vs_stages WHERE stage_number = 29
UNION ALL SELECT id, 'Rekkles', 3, 7, 4 FROM vs_stages WHERE stage_number = 29
UNION ALL SELECT id, 'Hylissang', 3, 7, 5 FROM vs_stages WHERE stage_number = 29;

-- Stage 30: 국제 드림팀 1
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 3, 7, 1 FROM vs_stages WHERE stage_number = 30
UNION ALL SELECT id, 'Canyon', 3, 7, 2 FROM vs_stages WHERE stage_number = 30
UNION ALL SELECT id, 'Faker', 3, 7, 3 FROM vs_stages WHERE stage_number = 30
UNION ALL SELECT id, 'Viper', 3, 7, 4 FROM vs_stages WHERE stage_number = 30
UNION ALL SELECT id, 'Keria', 3, 7, 5 FROM vs_stages WHERE stage_number = 30;

-- Stage 31: 국제 드림팀 2
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 3, 7, 1 FROM vs_stages WHERE stage_number = 31
UNION ALL SELECT id, 'Peanut', 3, 7, 2 FROM vs_stages WHERE stage_number = 31
UNION ALL SELECT id, 'Chovy', 3, 7, 3 FROM vs_stages WHERE stage_number = 31
UNION ALL SELECT id, 'Ruler', 3, 7, 4 FROM vs_stages WHERE stage_number = 31
UNION ALL SELECT id, 'Meiko', 3, 7, 5 FROM vs_stages WHERE stage_number = 31;

-- Stage 32: 국제 드림팀 3
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'TheShy', 4, 8, 1 FROM vs_stages WHERE stage_number = 32
UNION ALL SELECT id, 'Canyon', 4, 8, 2 FROM vs_stages WHERE stage_number = 32
UNION ALL SELECT id, 'Caps', 4, 8, 3 FROM vs_stages WHERE stage_number = 32
UNION ALL SELECT id, 'Gumayusi', 4, 8, 4 FROM vs_stages WHERE stage_number = 32
UNION ALL SELECT id, 'Keria', 4, 8, 5 FROM vs_stages WHERE stage_number = 32;

-- Stage 33: 어려움 최종보스
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 4, 8, 1 FROM vs_stages WHERE stage_number = 33
UNION ALL SELECT id, 'Canyon', 4, 8, 2 FROM vs_stages WHERE stage_number = 33
UNION ALL SELECT id, 'Chovy', 4, 8, 3 FROM vs_stages WHERE stage_number = 33
UNION ALL SELECT id, 'Ruler', 4, 8, 4 FROM vs_stages WHERE stage_number = 33
UNION ALL SELECT id, 'Keria', 4, 8, 5 FROM vs_stages WHERE stage_number = 33;

-- 34~49단계: 지옥 (강화 5~9)
-- Stage 34-38: Gen.G 최강 로테이션
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 5, 9, 1 FROM vs_stages WHERE stage_number = 34
UNION ALL SELECT id, 'Canyon', 5, 9, 2 FROM vs_stages WHERE stage_number = 34
UNION ALL SELECT id, 'Chovy', 5, 9, 3 FROM vs_stages WHERE stage_number = 34
UNION ALL SELECT id, 'Ruler', 5, 9, 4 FROM vs_stages WHERE stage_number = 34
UNION ALL SELECT id, 'Duro', 5, 9, 5 FROM vs_stages WHERE stage_number = 34;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 5, 9, 1 FROM vs_stages WHERE stage_number = 35
UNION ALL SELECT id, 'Oner', 5, 9, 2 FROM vs_stages WHERE stage_number = 35
UNION ALL SELECT id, 'Faker', 5, 9, 3 FROM vs_stages WHERE stage_number = 35
UNION ALL SELECT id, 'Gumayusi', 5, 9, 4 FROM vs_stages WHERE stage_number = 35
UNION ALL SELECT id, 'Keria', 5, 9, 5 FROM vs_stages WHERE stage_number = 35;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 6, 10, 1 FROM vs_stages WHERE stage_number = 36
UNION ALL SELECT id, 'Peanut', 6, 10, 2 FROM vs_stages WHERE stage_number = 36
UNION ALL SELECT id, 'Chovy', 6, 10, 3 FROM vs_stages WHERE stage_number = 36
UNION ALL SELECT id, 'Viper', 6, 10, 4 FROM vs_stages WHERE stage_number = 36
UNION ALL SELECT id, 'Keria', 6, 10, 5 FROM vs_stages WHERE stage_number = 36;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 6, 10, 1 FROM vs_stages WHERE stage_number = 37
UNION ALL SELECT id, 'Canyon', 6, 10, 2 FROM vs_stages WHERE stage_number = 37
UNION ALL SELECT id, 'Faker', 6, 10, 3 FROM vs_stages WHERE stage_number = 37
UNION ALL SELECT id, 'Ruler', 6, 10, 4 FROM vs_stages WHERE stage_number = 37
UNION ALL SELECT id, 'Keria', 6, 10, 5 FROM vs_stages WHERE stage_number = 37;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'TheShy', 6, 10, 1 FROM vs_stages WHERE stage_number = 38
UNION ALL SELECT id, 'Canyon', 6, 10, 2 FROM vs_stages WHERE stage_number = 38
UNION ALL SELECT id, 'Chovy', 6, 10, 3 FROM vs_stages WHERE stage_number = 38
UNION ALL SELECT id, 'Ruler', 6, 10, 4 FROM vs_stages WHERE stage_number = 38
UNION ALL SELECT id, 'Meiko', 6, 10, 5 FROM vs_stages WHERE stage_number = 38;

-- Stage 39-43: 전설팀 (강화 7~8)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 7, 10, 1 FROM vs_stages WHERE stage_number = 39
UNION ALL SELECT id, 'Canyon', 7, 10, 2 FROM vs_stages WHERE stage_number = 39
UNION ALL SELECT id, 'Chovy', 7, 10, 3 FROM vs_stages WHERE stage_number = 39
UNION ALL SELECT id, 'Viper', 7, 10, 4 FROM vs_stages WHERE stage_number = 39
UNION ALL SELECT id, 'Keria', 7, 10, 5 FROM vs_stages WHERE stage_number = 39;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 7, 10, 1 FROM vs_stages WHERE stage_number = 40
UNION ALL SELECT id, 'Canyon', 7, 10, 2 FROM vs_stages WHERE stage_number = 40
UNION ALL SELECT id, 'Faker', 7, 10, 3 FROM vs_stages WHERE stage_number = 40
UNION ALL SELECT id, 'Ruler', 7, 10, 4 FROM vs_stages WHERE stage_number = 40
UNION ALL SELECT id, 'Keria', 7, 10, 5 FROM vs_stages WHERE stage_number = 40;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 7, 10, 1 FROM vs_stages WHERE stage_number = 41
UNION ALL SELECT id, 'Peanut', 7, 10, 2 FROM vs_stages WHERE stage_number = 41
UNION ALL SELECT id, 'Chovy', 7, 10, 3 FROM vs_stages WHERE stage_number = 41
UNION ALL SELECT id, 'Gumayusi', 7, 10, 4 FROM vs_stages WHERE stage_number = 41
UNION ALL SELECT id, 'Keria', 7, 10, 5 FROM vs_stages WHERE stage_number = 41;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 8, 10, 1 FROM vs_stages WHERE stage_number = 42
UNION ALL SELECT id, 'Canyon', 8, 10, 2 FROM vs_stages WHERE stage_number = 42
UNION ALL SELECT id, 'Faker', 8, 10, 3 FROM vs_stages WHERE stage_number = 42
UNION ALL SELECT id, 'Viper', 8, 10, 4 FROM vs_stages WHERE stage_number = 42
UNION ALL SELECT id, 'Keria', 8, 10, 5 FROM vs_stages WHERE stage_number = 42;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 8, 10, 1 FROM vs_stages WHERE stage_number = 43
UNION ALL SELECT id, 'Canyon', 8, 10, 2 FROM vs_stages WHERE stage_number = 43
UNION ALL SELECT id, 'Chovy', 8, 10, 3 FROM vs_stages WHERE stage_number = 43
UNION ALL SELECT id, 'Ruler', 8, 10, 4 FROM vs_stages WHERE stage_number = 43
UNION ALL SELECT id, 'Keria', 8, 10, 5 FROM vs_stages WHERE stage_number = 43;

-- Stage 44-48: 최종 관문 (강화 9)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 9, 10, 1 FROM vs_stages WHERE stage_number = 44
UNION ALL SELECT id, 'Canyon', 9, 10, 2 FROM vs_stages WHERE stage_number = 44
UNION ALL SELECT id, 'Faker', 9, 10, 3 FROM vs_stages WHERE stage_number = 44
UNION ALL SELECT id, 'Ruler', 9, 10, 4 FROM vs_stages WHERE stage_number = 44
UNION ALL SELECT id, 'Keria', 9, 10, 5 FROM vs_stages WHERE stage_number = 44;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 9, 10, 1 FROM vs_stages WHERE stage_number = 45
UNION ALL SELECT id, 'Canyon', 9, 10, 2 FROM vs_stages WHERE stage_number = 45
UNION ALL SELECT id, 'Chovy', 9, 10, 3 FROM vs_stages WHERE stage_number = 45
UNION ALL SELECT id, 'Viper', 9, 10, 4 FROM vs_stages WHERE stage_number = 45
UNION ALL SELECT id, 'Keria', 9, 10, 5 FROM vs_stages WHERE stage_number = 45;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 9, 10, 1 FROM vs_stages WHERE stage_number = 46
UNION ALL SELECT id, 'Peanut', 9, 10, 2 FROM vs_stages WHERE stage_number = 46
UNION ALL SELECT id, 'Faker', 9, 10, 3 FROM vs_stages WHERE stage_number = 46
UNION ALL SELECT id, 'Gumayusi', 9, 10, 4 FROM vs_stages WHERE stage_number = 46
UNION ALL SELECT id, 'Keria', 9, 10, 5 FROM vs_stages WHERE stage_number = 46;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 9, 10, 1 FROM vs_stages WHERE stage_number = 47
UNION ALL SELECT id, 'Canyon', 9, 10, 2 FROM vs_stages WHERE stage_number = 47
UNION ALL SELECT id, 'Chovy', 9, 10, 3 FROM vs_stages WHERE stage_number = 47
UNION ALL SELECT id, 'Ruler', 9, 10, 4 FROM vs_stages WHERE stage_number = 47
UNION ALL SELECT id, 'Keria', 9, 10, 5 FROM vs_stages WHERE stage_number = 47;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 9, 10, 1 FROM vs_stages WHERE stage_number = 48
UNION ALL SELECT id, 'Canyon', 9, 10, 2 FROM vs_stages WHERE stage_number = 48
UNION ALL SELECT id, 'Faker', 9, 10, 3 FROM vs_stages WHERE stage_number = 48
UNION ALL SELECT id, 'Viper', 9, 10, 4 FROM vs_stages WHERE stage_number = 48
UNION ALL SELECT id, 'Keria', 9, 10, 5 FROM vs_stages WHERE stage_number = 48;

-- Stage 49: 지옥 최종 보스 (강화 10)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 10, 10, 1 FROM vs_stages WHERE stage_number = 49
UNION ALL SELECT id, 'Canyon', 10, 10, 2 FROM vs_stages WHERE stage_number = 49
UNION ALL SELECT id, 'Faker', 10, 10, 3 FROM vs_stages WHERE stage_number = 49
UNION ALL SELECT id, 'Ruler', 10, 10, 4 FROM vs_stages WHERE stage_number = 49
UNION ALL SELECT id, 'Keria', 10, 10, 5 FROM vs_stages WHERE stage_number = 49;

-- Stage 50: 궁극의 도전 - ICON 올스타 (일반 8강, 하드 10강)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Nuguri', 8, 10, 1 FROM vs_stages WHERE stage_number = 50
UNION ALL SELECT id, 'Bengi', 8, 10, 2 FROM vs_stages WHERE stage_number = 50
UNION ALL SELECT id, 'Perkz', 8, 10, 3 FROM vs_stages WHERE stage_number = 50
UNION ALL SELECT id, 'Uzi', 8, 10, 4 FROM vs_stages WHERE stage_number = 50
UNION ALL SELECT id, 'Mata', 8, 10, 5 FROM vs_stages WHERE stage_number = 50;
-- 18'WC Season Players
-- 2018 World Championship

USE lol_card_game;

-- Flash Wolves
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Hanabi', 'FW', 'TOP', 89, 'LCP', '18WC'),
('18WC Moojin', 'FW', 'JUNGLE', 90, 'LCP', '18WC'),
('18WC Maple', 'FW', 'MID', 93, 'LCP', '18WC'),
('18WC Betty', 'FW', 'ADC', 90, 'LCP', '18WC'),
('18WC SwordArT', 'FW', 'SUPPORT', 95, 'LCP', '18WC');

-- Phong Vũ Buffalo
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Zeros', 'PVB', 'TOP', 80, 'LCP', '18WC'),
('18WC Meliodas', 'PVB', 'JUNGLE', 78, 'LCP', '18WC'),
('18WC Naul', 'PVB', 'MID', 79, 'LCP', '18WC'),
('18WC Bigkoro', 'PVB', 'ADC', 78, 'LCP', '18WC'),
('18WC Palette', 'PVB', 'SUPPORT', 66, 'LCP', '18WC');

-- Team Vitality
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Cabochard', 'VIT', 'TOP', 89, 'LEC', '18WC'),
('18WC Kikis', 'VIT', 'JUNGLE', 88, 'LEC', '18WC'),
('18WC Jiizuke', 'VIT', 'MID', 88, 'LEC', '18WC'),
('18WC Attila', 'VIT', 'ADC', 80, 'LEC', '18WC'),
('18WC Jactroll', 'VIT', 'SUPPORT', 77, 'LEC', '18WC'),
('18WC Dreams', 'VIT', 'SUPPORT', 70, 'LEC', '18WC');

-- GEN.G (2018)
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC CuVee', 'GEN.G', 'TOP', 84, 'LCK', '18WC'),
('18WC Ambition', 'GEN.G', 'JUNGLE', 85, 'LCK', '18WC'),
('18WC Crown', 'GEN.G', 'MID', 80, 'LCK', '18WC'),
('18WC Ruler', 'GEN.G', 'ADC', 88, 'LCK', '18WC'),
('18WC CoreJJ', 'GEN.G', 'SUPPORT', 87, 'LCK', '18WC');

-- Team Liquid
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Impact', 'TL', 'TOP', 85, 'LTA', '18WC'),
('18WC Xmithie', 'TL', 'JUNGLE', 83, 'LTA', '18WC'),
('18WC Pobelter', 'TL', 'MID', 80, 'LTA', '18WC'),
('18WC Doublelift', 'TL', 'ADC', 88, 'LTA', '18WC'),
('18WC Olleh', 'TL', 'SUPPORT', 81, 'LTA', '18WC');

-- MAD TEAM
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Liang', 'MAD', 'TOP', 74, 'LCP', '18WC'),
('18WC Kongyue', 'MAD', 'JUNGLE', 75, 'LCP', '18WC'),
('18WC Uniboy', 'MAD', 'MID', 77, 'LCP', '18WC'),
('18WC Breeze', 'MAD', 'ADC', 74, 'LCP', '18WC'),
('18WC K', 'MAD', 'SUPPORT', 70, 'LCP', '18WC');

-- 100 Thieves
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Ssumday', '100T', 'TOP', 83, 'LTA', '18WC'),
('18WC AnDa', '100T', 'JUNGLE', 80, 'LTA', '18WC'),
('18WC Ryu', '100T', 'MID', 78, 'LTA', '18WC'),
('18WC Cody Sun', '100T', 'ADC', 70, 'LTA', '18WC'),
('18WC aphromoo', '100T', 'SUPPORT', 72, 'LTA', '18WC');

-- G-Rex
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC PK', 'GRX', 'TOP', 80, 'LCP', '18WC'),
('18WC Empt2y', 'GRX', 'JUNGLE', 66, 'LCP', '18WC'),
('18WC Candy', 'GRX', 'MID', 68, 'LCP', '18WC'),
('18WC Stitch', 'GRX', 'ADC', 66, 'LCP', '18WC'),
('18WC Koala', 'GRX', 'SUPPORT', 65, 'LCP', '18WC');

-- KT Rolster (2018 World Championship)
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Smeb', 'KT', 'TOP', 92, 'LCK', '18WC'),
('18WC Score', 'KT', 'JUNGLE', 93, 'LCK', '18WC'),
('18WC Ucal', 'KT', 'MID', 99, 'LCK', '18WC'),
('18WC Deft', 'KT', 'ADC', 100, 'LCK', '18WC'),
('18WC Mata', 'KT', 'SUPPORT', 93, 'LCK', '18WC'),
('18WC Kingen', 'KT', 'TOP', 72, 'LCK', '18WC');

-- Afreeca Freecs
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Kiin', 'AF', 'TOP', 85, 'LCK', '18WC'),
('18WC Spirit', 'AF', 'JUNGLE', 83, 'LCK', '18WC'),
('18WC Kuro', 'AF', 'MID', 85, 'LCK', '18WC'),
('18WC Kramer', 'AF', 'ADC', 80, 'LCK', '18WC'),
('18WC TusiN', 'AF', 'SUPPORT', 77, 'LCK', '18WC'),
('18WC Mowgli', 'AF', 'JUNGLE', 70, 'LCK', '18WC');

-- Royal Never Give Up
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Letme', 'RNG', 'TOP', 83, 'LPL', '18WC'),
('18WC Mlxg', 'RNG', 'JUNGLE', 90, 'LPL', '18WC'),
('18WC Xiaohu', 'RNG', 'MID', 90, 'LPL', '18WC'),
('18WC Uzi', 'RNG', 'ADC', 95, 'LPL', '18WC'),
('18WC Ming', 'RNG', 'SUPPORT', 93, 'LPL', '18WC'),
('18WC Karsa', 'RNG', 'JUNGLE', 83, 'LPL', '18WC');

-- EDward Gaming
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Ray', 'EDG', 'TOP', 82, 'LPL', '18WC'),
('18WC Clearlove', 'EDG', 'JUNGLE', 83, 'LPL', '18WC'),
('18WC Scout', 'EDG', 'MID', 90, 'LPL', '18WC'),
('18WC iBoy', 'EDG', 'ADC', 93, 'LPL', '18WC'),
('18WC Meiko', 'EDG', 'SUPPORT', 95, 'LPL', '18WC');

-- G2 Esports (2018)
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Wunder', 'G2', 'TOP', 95, 'LEC', '18WC'),
('18WC Jankos', 'G2', 'JUNGLE', 95, 'LEC', '18WC'),
('18WC Perkz', 'G2', 'MID', 96, 'LEC', '18WC'),
('18WC Hjarnan', 'G2', 'ADC', 93, 'LEC', '18WC'),
('18WC Wadid', 'G2', 'SUPPORT', 97, 'LEC', '18WC');

-- Cloud9
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Licorice', 'C9', 'TOP', 95, 'LTA', '18WC'),
('18WC Blaber', 'C9', 'JUNGLE', 93, 'LTA', '18WC'),
('18WC Jensen', 'C9', 'MID', 94, 'LTA', '18WC'),
('18WC Sneaky', 'C9', 'ADC', 95, 'LTA', '18WC'),
('18WC Zeyzal', 'C9', 'SUPPORT', 92, 'LTA', '18WC');

-- Fnatic (2018 Finalists)
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Bwipo', 'FNC', 'TOP', 100, 'LEC', '18WC'),
('18WC Broxah', 'FNC', 'JUNGLE', 101, 'LEC', '18WC'),
('18WC Caps', 'FNC', 'MID', 103, 'LEC', '18WC'),
('18WC Rekkles', 'FNC', 'ADC', 104, 'LEC', '18WC'),
('18WC Hylissang', 'FNC', 'SUPPORT', 103, 'LEC', '18WC');

-- Invictus Gaming (2018 WORLD CHAMPIONS)
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC TheShy', 'IG', 'TOP', 105, 'LPL', '18WC'),
('18WC Ning', 'IG', 'JUNGLE', 101, 'LPL', '18WC'),
('18WC Rookie', 'IG', 'MID', 106, 'LPL', '18WC'),
('18WC JackeyLove', 'IG', 'ADC', 106, 'LPL', '18WC'),
('18WC Baolan', 'IG', 'SUPPORT', 105, 'LPL', '18WC'),
('18WC Duke', 'IG', 'TOP', 94, 'LPL', '18WC');

-- SuperMassive
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC fabFabulous', 'SPM', 'TOP', 68, 'LEC', '18WC'),
('18WC Stomaged', 'SPM', 'JUNGLE', 70, 'LEC', '18WC'),
('18WC GBM', 'SPM', 'MID', 72, 'LEC', '18WC'),
('18WC Zeitnot', 'SPM', 'ADC', 66, 'LEC', '18WC'),
('18WC SnowFlower', 'SPM', 'SUPPORT', 65, 'LEC', '18WC');

-- Gambit Esports
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC PvPStejos', 'GMB', 'TOP', 63, 'LEC', '18WC'),
('18WC Diamondprox', 'GMB', 'JUNGLE', 60, 'LEC', '18WC'),
('18WC Kira', 'GMB', 'MID', 63, 'LEC', '18WC'),
('18WC Lodik', 'GMB', 'ADC', 65, 'LEC', '18WC'),
('18WC Edward', 'GMB', 'SUPPORT', 65, 'LEC', '18WC');

-- KaBuM! e-Sports
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC zantins', 'KBM', 'TOP', 63, 'LTA', '18WC'),
('18WC Ranger', 'KBM', 'JUNGLE', 64, 'LTA', '18WC'),
('18WC dyNquedo', 'KBM', 'MID', 64, 'LTA', '18WC'),
('18WC Titan', 'KBM', 'ADC', 70, 'LTA', '18WC'),
('18WC Riyev', 'KBM', 'SUPPORT', 61, 'LTA', '18WC');

-- Infinity eSports
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Relic', 'INF', 'TOP', 53, 'LCP', '18WC'),
('18WC SolidSnake', 'INF', 'JUNGLE', 55, 'LCP', '18WC'),
('18WC Cotopaco', 'INF', 'MID', 62, 'LCP', '18WC'),
('18WC Renyu', 'INF', 'ADC', 63, 'LCP', '18WC'),
('18WC Arce', 'INF', 'SUPPORT', 55, 'LCP', '18WC'),
('18WC ottovaG', 'INF', 'ADC', 50, 'LCP', '18WC');

-- Dire Wolves
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC BioPanther', 'DW', 'TOP', 53, 'LCP', '18WC'),
('18WC Shernfire', 'DW', 'JUNGLE', 56, 'LCP', '18WC'),
('18WC Triple', 'DW', 'MID', 55, 'LCP', '18WC'),
('18WC K1ng', 'DW', 'ADC', 53, 'LCP', '18WC'),
('18WC Cupcake', 'DW', 'SUPPORT', 50, 'LCP', '18WC');

-- Kaos Latin Gamers
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Nate', 'KLG', 'TOP', 55, 'LCP', '18WC'),
('18WC Tierwulf', 'KLG', 'JUNGLE', 56, 'LCP', '18WC'),
('18WC Plugo', 'KLG', 'MID', 55, 'LCP', '18WC'),
('18WC Fix', 'KLG', 'ADC', 53, 'LCP', '18WC'),
('18WC Slow', 'KLG', 'SUPPORT', 54, 'LCP', '18WC');

-- Ascension Gaming
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Rockky', 'ASC', 'TOP', 54, 'LCP', '18WC'),
('18WC Lloyd', 'ASC', 'JUNGLE', 55, 'LCP', '18WC'),
('18WC G4', 'ASC', 'MID', 56, 'LCP', '18WC'),
('18WC NikSar', 'ASC', 'ADC', 55, 'LCP', '18WC'),
('18WC Rich', 'ASC', 'SUPPORT', 56, 'LCP', '18WC');

-- DetonatioN FocusMe
INSERT INTO players (name, team, position, overall, region, season) VALUES
('18WC Evi', 'DFM', 'TOP', 66, 'LCP', '18WC'),
('18WC Steal', 'DFM', 'JUNGLE', 65, 'LCP', '18WC'),
('18WC Ceros', 'DFM', 'MID', 66, 'LCP', '18WC'),
('18WC Yutapon', 'DFM', 'ADC', 68, 'LCP', '18WC'),
('18WC viviD', 'DFM', 'SUPPORT', 66, 'LCP', '18WC');
-- 18'WC Season Players
-- 2018 World Championship

USE lol_card_game;

-- Flash Wolves
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Hanabi', 'FW', 'TOP', 89, 'LCP', 'EPIC', '18WC'),
('18WC Moojin', 'FW', 'JUNGLE', 90, 'LCP', 'EPIC', '18WC'),
('18WC Maple', 'FW', 'MID', 93, 'LCP', 'LEGENDARY', '18WC'),
('18WC Betty', 'FW', 'ADC', 90, 'LCP', 'EPIC', '18WC'),
('18WC SwordArT', 'FW', 'SUPPORT', 95, 'LCP', 'LEGENDARY', '18WC');

-- Phong Vũ Buffalo
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Zeros', 'PVB', 'TOP', 80, 'LCP', 'RARE', '18WC'),
('18WC Meliodas', 'PVB', 'JUNGLE', 78, 'LCP', 'RARE', '18WC'),
('18WC Naul', 'PVB', 'MID', 79, 'LCP', 'RARE', '18WC'),
('18WC Bigkoro', 'PVB', 'ADC', 78, 'LCP', 'RARE', '18WC'),
('18WC Palette', 'PVB', 'SUPPORT', 66, 'LCP', 'COMMON', '18WC');

-- Team Vitality
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Cabochard', 'VIT', 'TOP', 89, 'LEC', 'EPIC', '18WC'),
('18WC Kikis', 'VIT', 'JUNGLE', 88, 'LEC', 'EPIC', '18WC'),
('18WC Jiizuke', 'VIT', 'MID', 88, 'LEC', 'EPIC', '18WC'),
('18WC Attila', 'VIT', 'ADC', 80, 'LEC', 'RARE', '18WC'),
('18WC Jactroll', 'VIT', 'SUPPORT', 77, 'LEC', 'RARE', '18WC'),
('18WC Dreams', 'VIT', 'SUPPORT', 70, 'LEC', 'COMMON', '18WC');

-- GEN.G (2018)
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC CuVee', 'GEN.G', 'TOP', 84, 'LCK', 'EPIC', '18WC'),
('18WC Ambition', 'GEN.G', 'JUNGLE', 85, 'LCK', 'EPIC', '18WC'),
('18WC Crown', 'GEN.G', 'MID', 80, 'LCK', 'RARE', '18WC'),
('18WC Ruler', 'GEN.G', 'ADC', 88, 'LCK', 'EPIC', '18WC'),
('18WC CoreJJ', 'GEN.G', 'SUPPORT', 87, 'LCK', 'EPIC', '18WC');

-- Team Liquid
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Impact', 'TL', 'TOP', 85, 'LTA', 'EPIC', '18WC'),
('18WC Xmithie', 'TL', 'JUNGLE', 83, 'LTA', 'EPIC', '18WC'),
('18WC Pobelter', 'TL', 'MID', 80, 'LTA', 'RARE', '18WC'),
('18WC Doublelift', 'TL', 'ADC', 88, 'LTA', 'EPIC', '18WC'),
('18WC Olleh', 'TL', 'SUPPORT', 81, 'LTA', 'EPIC', '18WC');

-- MAD TEAM
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Liang', 'MAD', 'TOP', 74, 'LCP', 'RARE', '18WC'),
('18WC Kongyue', 'MAD', 'JUNGLE', 75, 'LCP', 'RARE', '18WC'),
('18WC Uniboy', 'MAD', 'MID', 77, 'LCP', 'RARE', '18WC'),
('18WC Breeze', 'MAD', 'ADC', 74, 'LCP', 'RARE', '18WC'),
('18WC K', 'MAD', 'SUPPORT', 70, 'LCP', 'COMMON', '18WC');

-- 100 Thieves
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Ssumday', '100T', 'TOP', 83, 'LTA', 'EPIC', '18WC'),
('18WC AnDa', '100T', 'JUNGLE', 80, 'LTA', 'RARE', '18WC'),
('18WC Ryu', '100T', 'MID', 78, 'LTA', 'RARE', '18WC'),
('18WC Cody Sun', '100T', 'ADC', 70, 'LTA', 'COMMON', '18WC'),
('18WC aphromoo', '100T', 'SUPPORT', 72, 'LTA', 'RARE', '18WC');

-- G-Rex
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC PK', 'GRX', 'TOP', 80, 'LCP', 'RARE', '18WC'),
('18WC Empt2y', 'GRX', 'JUNGLE', 66, 'LCP', 'COMMON', '18WC'),
('18WC Candy', 'GRX', 'MID', 68, 'LCP', 'COMMON', '18WC'),
('18WC Stitch', 'GRX', 'ADC', 66, 'LCP', 'COMMON', '18WC'),
('18WC Koala', 'GRX', 'SUPPORT', 65, 'LCP', 'COMMON', '18WC');

-- KT Rolster (2018 World Championship)
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Smeb', 'KT', 'TOP', 92, 'LCK', 'LEGENDARY', '18WC'),
('18WC Score', 'KT', 'JUNGLE', 93, 'LCK', 'LEGENDARY', '18WC'),
('18WC Ucal', 'KT', 'MID', 99, 'LCK', 'LEGENDARY', '18WC'),
('18WC Deft', 'KT', 'ADC', 100, 'LCK', 'LEGENDARY', '18WC'),
('18WC Mata', 'KT', 'SUPPORT', 93, 'LCK', 'LEGENDARY', '18WC'),
('18WC Kingen', 'KT', 'TOP', 72, 'LCK', 'RARE', '18WC');

-- Afreeca Freecs
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Kiin', 'AF', 'TOP', 85, 'LCK', 'EPIC', '18WC'),
('18WC Spirit', 'AF', 'JUNGLE', 83, 'LCK', 'EPIC', '18WC'),
('18WC Kuro', 'AF', 'MID', 85, 'LCK', 'EPIC', '18WC'),
('18WC Kramer', 'AF', 'ADC', 80, 'LCK', 'RARE', '18WC'),
('18WC TusiN', 'AF', 'SUPPORT', 77, 'LCK', 'RARE', '18WC'),
('18WC Mowgli', 'AF', 'JUNGLE', 70, 'LCK', 'COMMON', '18WC');

-- Royal Never Give Up
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Letme', 'RNG', 'TOP', 83, 'LPL', 'EPIC', '18WC'),
('18WC Mlxg', 'RNG', 'JUNGLE', 90, 'LPL', 'EPIC', '18WC'),
('18WC Xiaohu', 'RNG', 'MID', 90, 'LPL', 'EPIC', '18WC'),
('18WC Uzi', 'RNG', 'ADC', 95, 'LPL', 'LEGENDARY', '18WC'),
('18WC Ming', 'RNG', 'SUPPORT', 93, 'LPL', 'LEGENDARY', '18WC'),
('18WC Karsa', 'RNG', 'JUNGLE', 83, 'LPL', 'EPIC', '18WC');

-- EDward Gaming
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Ray', 'EDG', 'TOP', 82, 'LPL', 'EPIC', '18WC'),
('18WC Clearlove', 'EDG', 'JUNGLE', 83, 'LPL', 'EPIC', '18WC'),
('18WC Scout', 'EDG', 'MID', 90, 'LPL', 'EPIC', '18WC'),
('18WC iBoy', 'EDG', 'ADC', 93, 'LPL', 'LEGENDARY', '18WC'),
('18WC Meiko', 'EDG', 'SUPPORT', 95, 'LPL', 'LEGENDARY', '18WC');

-- G2 Esports (2018)
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Wunder', 'G2', 'TOP', 95, 'LEC', 'LEGENDARY', '18WC'),
('18WC Jankos', 'G2', 'JUNGLE', 95, 'LEC', 'LEGENDARY', '18WC'),
('18WC Perkz', 'G2', 'MID', 96, 'LEC', 'LEGENDARY', '18WC'),
('18WC Hjarnan', 'G2', 'ADC', 93, 'LEC', 'LEGENDARY', '18WC'),
('18WC Wadid', 'G2', 'SUPPORT', 97, 'LEC', 'LEGENDARY', '18WC');

-- Cloud9
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Licorice', 'C9', 'TOP', 95, 'LTA', 'LEGENDARY', '18WC'),
('18WC Blaber', 'C9', 'JUNGLE', 93, 'LTA', 'LEGENDARY', '18WC'),
('18WC Jensen', 'C9', 'MID', 94, 'LTA', 'LEGENDARY', '18WC'),
('18WC Sneaky', 'C9', 'ADC', 95, 'LTA', 'LEGENDARY', '18WC'),
('18WC Zeyzal', 'C9', 'SUPPORT', 92, 'LTA', 'EPIC', '18WC');

-- Fnatic (2018 Finalists)
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Bwipo', 'FNC', 'TOP', 100, 'LEC', 'LEGENDARY', '18WC'),
('18WC Broxah', 'FNC', 'JUNGLE', 101, 'LEC', 'LEGENDARY', '18WC'),
('18WC Caps', 'FNC', 'MID', 103, 'LEC', 'LEGENDARY', '18WC'),
('18WC Rekkles', 'FNC', 'ADC', 104, 'LEC', 'LEGENDARY', '18WC'),
('18WC Hylissang', 'FNC', 'SUPPORT', 103, 'LEC', 'LEGENDARY', '18WC');

-- Invictus Gaming (2018 WORLD CHAMPIONS)
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC TheShy', 'IG', 'TOP', 105, 'LPL', 'LEGENDARY', '18WC'),
('18WC Ning', 'IG', 'JUNGLE', 101, 'LPL', 'LEGENDARY', '18WC'),
('18WC Rookie', 'IG', 'MID', 106, 'LPL', 'LEGENDARY', '18WC'),
('18WC JackeyLove', 'IG', 'ADC', 106, 'LPL', 'LEGENDARY', '18WC'),
('18WC Baolan', 'IG', 'SUPPORT', 105, 'LPL', 'LEGENDARY', '18WC'),
('18WC Duke', 'IG', 'TOP', 94, 'LPL', 'LEGENDARY', '18WC');

-- SuperMassive
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC fabFabulous', 'SPM', 'TOP', 68, 'LEC', 'COMMON', '18WC'),
('18WC Stomaged', 'SPM', 'JUNGLE', 70, 'LEC', 'COMMON', '18WC'),
('18WC GBM', 'SPM', 'MID', 72, 'LEC', 'RARE', '18WC'),
('18WC Zeitnot', 'SPM', 'ADC', 66, 'LEC', 'COMMON', '18WC'),
('18WC SnowFlower', 'SPM', 'SUPPORT', 65, 'LEC', 'COMMON', '18WC');

-- Gambit Esports
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC PvPStejos', 'GMB', 'TOP', 63, 'LCL', 'COMMON', '18WC'),
('18WC Diamondprox', 'GMB', 'JUNGLE', 60, 'LCL', 'COMMON', '18WC'),
('18WC Kira', 'GMB', 'MID', 63, 'LCL', 'COMMON', '18WC'),
('18WC Lodik', 'GMB', 'ADC', 65, 'LCL', 'COMMON', '18WC'),
('18WC Edward', 'GMB', 'SUPPORT', 65, 'LCL', 'COMMON', '18WC');

-- KaBuM! e-Sports
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC zantins', 'KBM', 'TOP', 63, 'CBLOL', 'COMMON', '18WC'),
('18WC Ranger', 'KBM', 'JUNGLE', 64, 'CBLOL', 'COMMON', '18WC'),
('18WC dyNquedo', 'KBM', 'MID', 64, 'CBLOL', 'COMMON', '18WC'),
('18WC Titan', 'KBM', 'ADC', 70, 'CBLOL', 'COMMON', '18WC'),
('18WC Riyev', 'KBM', 'SUPPORT', 61, 'CBLOL', 'COMMON', '18WC');

-- Infinity eSports
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Relic', 'INF', 'TOP', 53, 'LCP', 'COMMON', '18WC'),
('18WC SolidSnake', 'INF', 'JUNGLE', 55, 'LCP', 'COMMON', '18WC'),
('18WC Cotopaco', 'INF', 'MID', 62, 'LCP', 'COMMON', '18WC'),
('18WC Renyu', 'INF', 'ADC', 63, 'LCP', 'COMMON', '18WC'),
('18WC Arce', 'INF', 'SUPPORT', 55, 'LCP', 'COMMON', '18WC'),
('18WC ottovaG', 'INF', 'ADC', 50, 'LCP', 'COMMON', '18WC');

-- Dire Wolves
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC BioPanther', 'DW', 'TOP', 53, 'LCP', 'COMMON', '18WC'),
('18WC Shernfire', 'DW', 'JUNGLE', 56, 'LCP', 'COMMON', '18WC'),
('18WC Triple', 'DW', 'MID', 55, 'LCP', 'COMMON', '18WC'),
('18WC K1ng', 'DW', 'ADC', 53, 'LCP', 'COMMON', '18WC'),
('18WC Cupcake', 'DW', 'SUPPORT', 50, 'LCP', 'COMMON', '18WC');

-- Kaos Latin Gamers
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Nate', 'KLG', 'TOP', 55, 'LCP', 'COMMON', '18WC'),
('18WC Tierwulf', 'KLG', 'JUNGLE', 56, 'LCP', 'COMMON', '18WC'),
('18WC Plugo', 'KLG', 'MID', 55, 'LCP', 'COMMON', '18WC'),
('18WC Fix', 'KLG', 'ADC', 53, 'LCP', 'COMMON', '18WC'),
('18WC Slow', 'KLG', 'SUPPORT', 54, 'LCP', 'COMMON', '18WC');

-- Ascension Gaming
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Rockky', 'ASC', 'TOP', 54, 'LCP', 'COMMON', '18WC'),
('18WC Lloyd', 'ASC', 'JUNGLE', 55, 'LCP', 'COMMON', '18WC'),
('18WC G4', 'ASC', 'MID', 56, 'LCP', 'COMMON', '18WC'),
('18WC NikSar', 'ASC', 'ADC', 55, 'LCP', 'COMMON', '18WC'),
('18WC Rich', 'ASC', 'SUPPORT', 56, 'LCP', 'COMMON', '18WC');

-- DetonatioN FocusMe
INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- TIER ADJUSTED BY OVERALL: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
('18WC Evi', 'DFM', 'TOP', 66, 'LCP', 'COMMON', '18WC'),
('18WC Steal', 'DFM', 'JUNGLE', 65, 'LCP', 'COMMON', '18WC'),
('18WC Ceros', 'DFM', 'MID', 66, 'LCP', 'COMMON', '18WC'),
('18WC Yutapon', 'DFM', 'ADC', 68, 'LCP', 'COMMON', '18WC'),
('18WC viviD', 'DFM', 'SUPPORT', 66, 'LCP', 'COMMON', '18WC');
-- 2019 G2 특별 시즌 카드 시스템

-- 1. 특별 특성 효과를 위한 컬럼 추가
ALTER TABLE players ADD COLUMN trait1_effect TEXT DEFAULT NULL;
ALTER TABLE players ADD COLUMN trait2_effect TEXT DEFAULT NULL;
ALTER TABLE players ADD COLUMN trait3_effect TEXT DEFAULT NULL;

-- 2. 2019 G2 선수 추가
INSERT INTO players (name, team, position, overall, region, tier, season,
    trait1, trait1_effect, trait2, trait2_effect,
    laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing,
    survivability, objective_control, vision_control, decision_making, consistency)
VALUES
-- Wunder
('Wunder', 'G2', 'TOP', 102, 'LEC', 'EPIC', '19G2',
    '무지성 돌격', '{"type":"conditional","condition":"leading_2_0","buff":3,"debuff":-5}',
    NULL, NULL,
    82, 80, 78, 85, 80, 82, 85, 75, 76, 70, 80, 78),

-- Jankos
('Jankos', 'G2', 'JUNGLE', 105, 'LEC', 'EPIC', '19G2',
    '획기적인 운영', '{"type":"strategy","strategy":"SPLIT","buff":1,"macro_bonus":5}',
    NULL, NULL,
    75, 82, 88, 90, 70, 75, 78, 80, 92, 85, 90, 88),

-- Caps
('Caps', 'G2', 'MID', 109, 'LEC', 'LEGENDARY', '19G2',
    '획기적인 운영', '{"type":"strategy","strategy":"SPLIT","buff":1,"macro_bonus":5}',
    NULL, NULL,
    90, 95, 88, 92, 92, 95, 98, 85, 85, 80, 92, 90),

-- Perkz (ADC)
('Perkz', 'G2', 'ADC', 105, 'LEC', 'EPIC', '19G2',
    '무지성 돌격', '{"type":"conditional","condition":"leading_2_0","buff":3,"debuff":-5}',
    NULL, NULL,
    85, 88, 82, 95, 85, 82, 92, 80, 78, 75, 88, 85),

-- Mikyx
('Mikyx', 'G2', 'SUPPORT', 108, 'LEC', 'LEGENDARY', '19G2',
    '획기적인 운영', '{"type":"strategy","strategy":"SPLIT","buff":1,"macro_bonus":5}',
    '새가슴', '{"type":"conditional","condition":"tied_2_2","debuff":-3}',
    70, 85, 90, 85, 65, 70, 68, 78, 88, 95, 88, 80);

-- 3. 19G2 가챠팩 테이블 생성
CREATE TABLE IF NOT EXISTS gacha_packs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    pack_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 19G2 가챠팩 추가
INSERT INTO gacha_packs (name, description, price, pack_type)
VALUES
('19G2 프리미엄 팩', 'G2 2019 골든로드 프리미엄 팩 - 에픽 이상 확정, 50회 천장 시스템', 15000, '19G2_PREMIUM'),
('19G2 라이트 팩', 'G2 2019 골든로드 라이트 팩 - 일반 등급 포함', 500, '19G2_LIGHT');

-- 5. 19G2 천장 카운터 테이블
CREATE TABLE IF NOT EXISTS user_gacha_pity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    pack_type VARCHAR(50) NOT NULL,
    pull_count INT DEFAULT 0,
    last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_pack (user_id, pack_type)
);

-- 6. 확인
SELECT name, team, position, overall, tier, season, trait1, trait2
FROM players
WHERE season = '19G2'
ORDER BY FIELD(position, 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT');

SELECT * FROM gacha_packs WHERE pack_type LIKE '19G2%';
-- Add market prices for 19WC (2019 World Championship) season players
-- Price is based on overall rating (tier calculated from overall)

INSERT INTO player_market_prices (player_id, base_price, current_price, price_floor, price_ceiling)
SELECT
  id,
  CASE
    WHEN overall > 100 THEN overall * 50  -- LEGENDARY
    WHEN overall > 90 THEN overall * 30   -- EPIC
    WHEN overall > 80 THEN overall * 20   -- RARE
    ELSE overall * 10                     -- COMMON
  END as base_price,
  CASE
    WHEN overall > 100 THEN overall * 50
    WHEN overall > 90 THEN overall * 30
    WHEN overall > 80 THEN overall * 20
    ELSE overall * 10
  END as current_price,
  CASE
    WHEN overall > 100 THEN overall * 50 - 200
    WHEN overall > 90 THEN overall * 30 - 150
    WHEN overall > 80 THEN overall * 20 - 100
    ELSE overall * 10 - 50
  END as price_floor,
  CASE
    WHEN overall > 100 THEN overall * 50 + 200
    WHEN overall > 90 THEN overall * 30 + 150
    WHEN overall > 80 THEN overall * 20 + 100
    ELSE overall * 10 + 50
  END as price_ceiling
FROM players
WHERE season = '19WC'
ON DUPLICATE KEY UPDATE
  base_price = VALUES(base_price),
  current_price = VALUES(current_price),
  price_floor = VALUES(price_floor),
  price_ceiling = VALUES(price_ceiling);

-- Confirmation
SELECT COUNT(*) as total_19wc_market_prices FROM player_market_prices pmp
JOIN players p ON pmp.player_id = p.id
WHERE p.season = '19WC';
-- 2017 SSG Worlds Winner Cards
INSERT INTO players (name, team, position, overall, region, tier, season, laning, teamfight, macro, mental) VALUES
('17SSG CuVee', 'SSG', 'TOP', 102, 'LCK', 'LEGENDARY', '2017', 95, 98, 96, 94),
('17SSG Ambition', 'SSG', 'JUNGLE', 94, 'LCK', 'EPIC', '2017', 85, 92, 96, 95),
('17SSG Crown', 'SSG', 'MID', 100, 'LCK', 'LEGENDARY', '2017', 94, 96, 95, 92),
('17SSG Ruler', 'SSG', 'ADC', 104, 'LCK', 'LEGENDARY', '2017', 98, 99, 97, 96),
('17SSG CoreJJ', 'SSG', 'SUPPORT', 100, 'LCK', 'LEGENDARY', '2017', 90, 98, 97, 95);

-- Add traits for special characteristics
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '월즈 챔피언', '2017 월드 챔피언십 우승', '+5 모든 스탯'
FROM players WHERE name LIKE '17SSG%';

-- CuVee: 라인전 강자
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '라인전 킹', '압도적인 라인전 능력', '+10 라인전'
FROM players WHERE name = '17SSG CuVee';

-- Ambition: 운영의 귀재
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '운영 천재', '완벽한 정글 운영', '+10 운영'
FROM players WHERE name = '17SSG Ambition';

-- Crown: 든든한 중원
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '안정감', '흔들리지 않는 중원', '+8 멘탈'
FROM players WHERE name = '17SSG Crown';

-- Ruler: 캐리력
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '한타의 신', '최고의 한타 캐리', '+12 한타'
FROM players WHERE name = '17SSG Ruler';

-- CoreJJ: 서포터의 정석
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '완벽한 서포터', '월드클래스 서포팅', '+10 한타'
FROM players WHERE name = '17SSG CoreJJ';
-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  target_user_id INT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_id (admin_id),
  INDEX idx_created_at (created_at)
);

-- Grant admin to specific user (change 'admin' to your username)
-- UPDATE users SET is_admin = TRUE WHERE username = 'admin';
-- Create table for AI battle history tracking
CREATE TABLE IF NOT EXISTS user_stats_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    battle_type ENUM('RANK', 'AI') NOT NULL,
    result ENUM('WIN', 'LOSE') NOT NULL,
    points_change INT NOT NULL,
    ai_difficulty INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_battle_type (battle_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Add AI wins and losses columns to user_stats table
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS ai_wins INT DEFAULT 0 COMMENT 'AI 배틀 승리 횟수',
ADD COLUMN IF NOT EXISTS ai_losses INT DEFAULT 0 COMMENT 'AI 배틀 패배 횟수';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_stats_ai ON user_stats(user_id, ai_wins, ai_losses);
-- Add is_locked column to user_cards table
ALTER TABLE user_cards
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE AFTER level;

-- Verify
SELECT 'user_cards schema after adding is_locked' as info;
DESCRIBE user_cards;
-- 코치 강화 레벨 추가
ALTER TABLE user_coaches
ADD COLUMN enhancement_level INT DEFAULT 0 COMMENT '강화 레벨 (최대 10)';

-- 코치 테이블에 현재 버프 값을 각 유저별로 저장하기 위해 user_coaches에 추가
ALTER TABLE user_coaches
ADD COLUMN current_buff_value INT DEFAULT NULL COMMENT '현재 강화된 버프 값 (NULL이면 기본값 사용)';
-- 선수 세부 스탯 8개 추가
-- 기존: laning, teamfight, macro, mental (4개)
-- 추가: cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency (8개)

ALTER TABLE players
ADD COLUMN IF NOT EXISTS cs_ability INT DEFAULT 50 COMMENT 'CS 수급 능력',
ADD COLUMN IF NOT EXISTS lane_pressure INT DEFAULT 50 COMMENT '라인전 압박력',
ADD COLUMN IF NOT EXISTS damage_dealing INT DEFAULT 50 COMMENT '딜량 기여도',
ADD COLUMN IF NOT EXISTS survivability INT DEFAULT 50 COMMENT '생존력',
ADD COLUMN IF NOT EXISTS objective_control INT DEFAULT 50 COMMENT '오브젝트 관리',
ADD COLUMN IF NOT EXISTS vision_control INT DEFAULT 50 COMMENT '시야 장악',
ADD COLUMN IF NOT EXISTS decision_making INT DEFAULT 50 COMMENT '판단력',
ADD COLUMN IF NOT EXISTS consistency INT DEFAULT 50 COMMENT '안정성';
-- Add market prices for 19G2 season players
-- Price is based on tier multiplier and overall rating

INSERT INTO player_market_prices (player_id, base_price, current_price, price_floor, price_ceiling)
SELECT
  id,
  CASE
    WHEN tier = 'LEGENDARY' THEN overall * 50
    WHEN tier = 'EPIC' THEN overall * 30
    WHEN tier = 'RARE' THEN overall * 20
    WHEN tier = 'COMMON' THEN overall * 10
    ELSE overall * 5
  END as base_price,
  CASE
    WHEN tier = 'LEGENDARY' THEN overall * 50
    WHEN tier = 'EPIC' THEN overall * 30
    WHEN tier = 'RARE' THEN overall * 20
    WHEN tier = 'COMMON' THEN overall * 10
    ELSE overall * 5
  END as current_price,
  CASE
    WHEN tier = 'LEGENDARY' THEN overall * 50 - 200
    WHEN tier = 'EPIC' THEN overall * 30 - 150
    WHEN tier = 'RARE' THEN overall * 20 - 100
    WHEN tier = 'COMMON' THEN overall * 10 - 50
    ELSE overall * 5 - 25
  END as price_floor,
  CASE
    WHEN tier = 'LEGENDARY' THEN overall * 50 + 200
    WHEN tier = 'EPIC' THEN overall * 30 + 150
    WHEN tier = 'RARE' THEN overall * 20 + 100
    WHEN tier = 'COMMON' THEN overall * 10 + 50
    ELSE overall * 5 + 25
  END as price_ceiling
FROM players
WHERE season = '19G2'
ON DUPLICATE KEY UPDATE
  base_price = VALUES(base_price),
  current_price = VALUES(current_price),
  price_floor = VALUES(price_floor),
  price_ceiling = VALUES(price_ceiling);
-- GR 티어 추가 (Greatest Rookies - 전성기 유망주들)
-- ICON 티어 오버롤 +5 상향

-- 1. ICON 티어 오버롤 +5 상향
UPDATE players
SET overall = overall + 5
WHERE tier = 'ICON';

-- 2. GR 티어 선수 추가
INSERT INTO players (name, team, position, overall, tier, region, season, image_url) VALUES
('Deft', 'EDG', 'ADC', 105, 'GR', 'LPL', '2014', '/players/deft_2014_gr.png'),
('Faker', 'SKT', 'MID', 103, 'GR', 'LCK', '2013', '/players/faker_2013_gr.png'),
('Siwoo', 'DK', 'TOP', 101, 'GR', 'LCK', '2019', '/players/siwoo_2019_gr.png'),
('Peanut', 'ROX', 'JUNGLE', 102, 'GR', 'LCK', '2016', '/players/peanut_2016_gr.png'),
('Keria', 'T1', 'SUPPORT', 104, 'GR', 'LCK', '2021', '/players/keria_2021_gr.png');

-- 3. 선수별 스탯 설정 (포지션 특성 반영)

-- Deft (ADC) - CS 능력과 딜량이 뛰어남
UPDATE players SET
  laning = 98,
  teamfight = 103,
  macro = 100,
  mental = 102,
  cs_ability = 105,
  lane_pressure = 95,
  damage_dealing = 108,
  survivability = 92,
  objective_control = 98,
  vision_control = 90,
  decision_making = 100,
  consistency = 103
WHERE name = 'Deft' AND tier = 'GR';

-- Faker (MID) - 올라운더, 모든 스탯 균형잡힘
UPDATE players SET
  laning = 102,
  teamfight = 105,
  macro = 103,
  mental = 108,
  cs_ability = 100,
  lane_pressure = 102,
  damage_dealing = 104,
  survivability = 99,
  objective_control = 101,
  vision_control = 98,
  decision_making = 106,
  consistency = 105
WHERE name = 'Faker' AND tier = 'GR';

-- Siwoo (TOP) - 균형잡힌 올라운더 탑라이너
UPDATE players SET
  laning = 100,
  teamfight = 102,
  macro = 99,
  mental = 98,
  cs_ability = 100,
  lane_pressure = 101,
  damage_dealing = 100,
  survivability = 103,
  objective_control = 99,
  vision_control = 95,
  decision_making = 100,
  consistency = 101
WHERE name = 'Siwoo' AND tier = 'GR';

-- Peanut (JUNGLE) - 오브젝트와 시야 장악 특화
UPDATE players SET
  laning = 85,
  teamfight = 100,
  macro = 105,
  mental = 98,
  cs_ability = 45,
  lane_pressure = 35,
  damage_dealing = 95,
  survivability = 103,
  objective_control = 108,
  vision_control = 106,
  decision_making = 104,
  consistency = 98
WHERE name = 'Peanut' AND tier = 'GR';

-- Keria (SUPPORT) - 시야, 판단력, 안정성 특화
UPDATE players SET
  laning = 90,
  teamfight = 102,
  macro = 106,
  mental = 105,
  cs_ability = 25,
  lane_pressure = 55,
  damage_dealing = 48,
  survivability = 100,
  objective_control = 99,
  vision_control = 110,
  decision_making = 108,
  consistency = 107
WHERE name = 'Keria' AND tier = 'GR';

-- 4. 특성 추가
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '중꺾마', '상대가 능력치가 더 높을 시 종합적으로 더 강해집니다', 'COMEBACK'
FROM players WHERE name = 'Deft' AND tier = 'GR';

INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '고전파', '역스윕을 할 가능성이 높아집니다', 'REVERSE_SWEEP'
FROM players WHERE name = 'Faker' AND tier = 'GR';

-- 5. GR 티어를 위한 시장 가격 설정 (ICON보다 높게)
INSERT INTO player_market_prices (player_id, current_price, price_floor, price_ceiling, base_price)
SELECT
  id,
  overall * 200 AS current_price,
  overall * 150 AS price_floor,
  overall * 300 AS price_ceiling,
  overall * 200 AS base_price
FROM players
WHERE tier = 'GR';
-- GR 티어를 ENUM에 추가
ALTER TABLE players
MODIFY COLUMN tier ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'ICON', 'GR') NOT NULL DEFAULT 'COMMON';
-- 구마유시 헌정 카드 추가
INSERT INTO players (name, team, position, overall, region, tier, season, laning, teamfight, macro, mental, image_url)
VALUES (
  'Gumayusi',
  'T1',
  'ADC',
  102,
  'LCK',
  'LEGENDARY',
  'T1',
  99,
  99,
  98,
  99,
  '/images/players/T1_Gumayusi.png'
);

-- 구마유시 카드 특성 추가
INSERT INTO player_traits (player_id, name, description, effect)
SELECT
  p.id,
  '월드 챔피언',
  'T1 월드 챔피언십 우승 헌정 카드',
  '+15% 전체 능력치'
FROM players p
WHERE p.name = 'Gumayusi' AND p.season = 'T1'
LIMIT 1;

INSERT INTO player_traits (player_id, name, description, effect)
SELECT
  p.id,
  '완벽한 포지셔닝',
  '한타에서 최적의 위치를 찾아냅니다',
  '+20% 한타 능력'
FROM players p
WHERE p.name = 'Gumayusi' AND p.season = 'T1'
LIMIT 1;

INSERT INTO player_traits (player_id, name, description, effect)
SELECT
  p.id,
  '캐리 본능',
  '중요한 순간 캐리력 발휘',
  '+25% 클러치 상황 능력치'
FROM players p
WHERE p.name = 'Gumayusi' AND p.season = 'T1'
LIMIT 1;
-- Add ICON and No Rival series players
USE lol_card_game;

-- ============================================
-- DELETE OLD VERSIONS
-- ============================================

-- Remove old Mystic, Deft, Peanut (non-ICON/NR versions)
DELETE FROM players WHERE name = 'Mystic' AND season IS NULL;
DELETE FROM players WHERE name = 'Deft' AND season IS NULL;
DELETE FROM players WHERE name = 'Peanut' AND season IS NULL;

-- ============================================
-- ICON SERIES - LEGENDARY RETIRED PLAYERS
-- ============================================

-- ICON Mystic (WE, DNF)
INSERT INTO players (name, team, position, overall, region, season, market_value) VALUES
('[ICON] Mystic', 'WE', 'ADC', 119, 'LPL', 'ICON', 150000);

SET @mystic_id = LAST_INSERT_ID();

-- Mystic teams
INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@mystic_id, 'WE', TRUE),
(@mystic_id, 'DNF', FALSE);

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@mystic_id, '울트라 하이퍼 캐리', '팀이 지고있을때 엄청난 기량을 보입니다.', '+5 ALL_STATS_WHEN_LOSING'),
(@mystic_id, '팀이 이상해', '파워 레벨이 팀이 550 미만일 경우 능력치 상승', '+10 ALL_STATS_IF_TEAM_POWER_BELOW_550');

-- Mystic stats (ICON)
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(@mystic_id, 88, 92, 95, 75, 85, 90);

-- ICON Deft (DRX, KT, EDG)
INSERT INTO players (name, team, position, overall, region, season, market_value) VALUES
('[ICON] Deft', 'DRX', 'ADC', 121, 'LCK', 'ICON', 180000);

SET @deft_id = LAST_INSERT_ID();

-- Deft teams
INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@deft_id, 'DRX', TRUE),
(@deft_id, 'KT', FALSE),
(@deft_id, 'EDG', FALSE);

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@deft_id, '중꺾마', '팀이 지고 있을때 기량을 보임', '+3 ALL_STATS_WHEN_LOSING'),
(@deft_id, '알파카', '타고난 재능', '+1 ALL_STATS');

-- Deft stats (ICON)
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(@deft_id, 90, 95, 93, 82, 88, 92);

-- ICON Peanut (HLE, T1, LGD, GEN)
INSERT INTO players (name, team, position, overall, region, season, market_value) VALUES
('[ICON] Peanut', 'HLE', 'JUNGLE', 118, 'LCK', 'ICON', 140000);

SET @peanut_id = LAST_INSERT_ID();

-- Peanut teams
INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@peanut_id, 'HLE', TRUE),
(@peanut_id, 'T1', FALSE),
(@peanut_id, 'LGD', FALSE),
(@peanut_id, 'GEN', FALSE);

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@peanut_id, '내가 최고야', '팀이 이기고 있을때 한타력 상승', '+10 TEAMFIGHT_WHEN_WINNING');

-- Peanut stats (ICON)
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(@peanut_id, 85, 90, 88, 85, 92, 88);

-- ============================================
-- NO RIVAL SERIES - LOWER OVR VERSIONS (NO TRAITS)
-- ============================================

-- No Rival Mystic (WE, DNF) - OVR 114
INSERT INTO players (name, team, position, overall, region, season, market_value) VALUES
('[NR] Mystic', 'WE', 'ADC', 114, 'LPL', 'NR', 80000);

SET @nr_mystic_id = LAST_INSERT_ID();

INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@nr_mystic_id, 'WE', TRUE),
(@nr_mystic_id, 'DNF', FALSE);

-- Mystic stats (No Rival)
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(@nr_mystic_id, 83, 87, 90, 70, 80, 85);

-- No Rival Deft (DRX, KT, EDG) - OVR 116
INSERT INTO players (name, team, position, overall, region, season, market_value) VALUES
('[NR] Deft', 'DRX', 'ADC', 116, 'LCK', 'NR', 95000);

SET @nr_deft_id = LAST_INSERT_ID();

INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@nr_deft_id, 'DRX', TRUE),
(@nr_deft_id, 'KT', FALSE),
(@nr_deft_id, 'EDG', FALSE);

-- Deft stats (No Rival)
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(@nr_deft_id, 85, 90, 88, 77, 83, 87);

-- No Rival Peanut (HLE, T1, LGD, GEN) - OVR 113
INSERT INTO players (name, team, position, overall, region, season, market_value) VALUES
('[NR] Peanut', 'HLE', 'JUNGLE', 113, 'LCK', 'NR', 75000);

SET @nr_peanut_id = LAST_INSERT_ID();

INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@nr_peanut_id, 'HLE', TRUE),
(@nr_peanut_id, 'T1', FALSE),
(@nr_peanut_id, 'LGD', FALSE),
(@nr_peanut_id, 'GEN', FALSE);

-- Peanut stats (No Rival)
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(@nr_peanut_id, 80, 85, 83, 80, 87, 83);

SELECT 'ICON and No Rival series players added successfully!' as Status;
-- Add is_active column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Set all existing users to active
UPDATE users SET is_active = TRUE WHERE is_active IS NULL;
-- Add isAdmin column to users table
ALTER TABLE users
ADD COLUMN isAdmin BOOLEAN NOT NULL DEFAULT FALSE AFTER email;

-- Set admin for user id 95 (or change this to your user id)
UPDATE users SET isAdmin = TRUE WHERE id = 95;

-- Verify
SELECT id, username, email, isAdmin FROM users WHERE isAdmin = TRUE;
-- LCK REWIND RE Series Cards
-- Legendary players from LCK history
-- Team synergy: NJS=BRO, AZF=CJ, MVP=Samsung, SKT=T1 (treated as same for synergy calculation)

INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- NJS (Najin Sword)
('RE MaKNooN', 'NJS', 'TOP', 86, 'LCK', 'EPIC', 'LCK REWIND'),

-- AZF (Azubu Frost)
('RE MadLife', 'AZF', 'SUPPORT', 93, 'LCK', 'LEGENDARY', 'LCK REWIND'),
('RE CloudTemplar', 'AZF', 'JUNGLE', 91, 'LCK', 'LEGENDARY', 'LCK REWIND'),

-- KT
('RE Ryu', 'KT', 'MID', 90, 'LCK', 'LEGENDARY', 'LCK REWIND'),
('RE inSec', 'KT', 'JUNGLE', 94, 'LCK', 'LEGENDARY', 'LCK REWIND'),
('RE KaKAO', 'KT', 'JUNGLE', 83, 'LCK', 'EPIC', 'LCK REWIND'),

-- MVP (Samsung)
('RE Dade', 'MVP', 'MID', 88, 'LCK', 'EPIC', 'LCK REWIND'),
('RE Imp', 'MVP', 'ADC', 100, 'LCK', 'LEGENDARY', 'LCK REWIND'),
('RE Mata', 'MVP', 'SUPPORT', 95, 'LCK', 'LEGENDARY', 'LCK REWIND'),
('RE Dandy', 'MVP', 'JUNGLE', 85, 'LCK', 'EPIC', 'LCK REWIND'),

-- SKT
('RE Bengi', 'SKT', 'JUNGLE', 97, 'LCK', 'LEGENDARY', 'LCK REWIND'),
('RE PoohManDu', 'SKT', 'SUPPORT', 90, 'LCK', 'LEGENDARY', 'LCK REWIND'),
('RE Piglet', 'SKT', 'ADC', 91, 'LCK', 'LEGENDARY', 'LCK REWIND'),
('RE Faker', 'SKT', 'MID', 94, 'LCK', 'LEGENDARY', 'LCK REWIND'),
('RE Impact', 'SKT', 'TOP', 83, 'LCK', 'EPIC', 'LCK REWIND');

-- Add traits for the legendary RE cards
-- Note: You'll need to get the player IDs after inserting the players above
-- This is an example of how to add traits once you have the IDs:

-- For RE Faker (example)
-- INSERT INTO player_traits (player_id, trait_name, description, bonus_type, bonus_value)
-- SELECT id, 'Unkillable Demon King', 'Legendary playmaking in crucial moments', 'TEAM_BOOST', 3
-- FROM players WHERE name = 'RE Faker';

-- For RE Imp (example)
-- INSERT INTO player_traits (player_id, trait_name, description, bonus_type, bonus_value)
-- SELECT id, 'Perfect ADC', 'World-class positioning and mechanics', 'POSITION_BOOST', 5
-- FROM players WHERE name = 'RE Imp';

-- For RE Mata (example)
-- INSERT INTO player_traits (player_id, trait_name, description, bonus_type, bonus_value)
-- SELECT id, 'Vision Master', 'Revolutionary support playmaking', 'TEAM_BOOST', 4
-- FROM players WHERE name = 'RE Mata';

-- For RE Bengi (example)
-- INSERT INTO player_traits (player_id, trait_name, description, bonus_type, bonus_value)
-- SELECT id, 'The Jungle', 'Perfect synergy with mid lane', 'TEAM_BOOST', 4
-- FROM players WHERE name = 'RE Bengi';

-- For RE MadLife (example)
-- INSERT INTO player_traits (player_id, trait_name, description, bonus_type, bonus_value)
-- SELECT id, 'Madlife Hooks', 'Legendary hook predictions', 'TEAM_BOOST', 4
-- FROM players WHERE name = 'RE MadLife';

-- For RE inSec (example)
-- INSERT INTO player_traits (player_id, trait_name, description, bonus_type, bonus_value)
-- SELECT id, 'InSec Kick', 'Revolutionary Lee Sin mechanics', 'POSITION_BOOST', 5
-- FROM players WHERE name = 'RE inSec';
-- Add matchmaking queue table
USE lol_card_game;

CREATE TABLE IF NOT EXISTS matchmaking_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    deck_id INT NOT NULL,
    rating INT NOT NULL,
    status ENUM('WAITING', 'MATCHED', 'CANCELLED') DEFAULT 'WAITING',
    matched_with INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 확성기 아이템 추가
CREATE TABLE IF NOT EXISTS user_megaphones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY (user_id)
);

-- 전체 메시지 로그
CREATE TABLE IF NOT EXISTS global_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  username VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_expires (expires_at),
  INDEX idx_created (created_at)
);

-- 모든 유저에게 확성기 0개로 초기화
INSERT INTO user_megaphones (user_id, count)
SELECT id, 0 FROM users
ON DUPLICATE KEY UPDATE count = count;
-- MSI Cards (Mid-Season Invitational Legends)
INSERT INTO players (name, team, position, overall, region, tier, season, laning, teamfight, macro, mental) VALUES
-- EDG
('MSI Deft', 'EDG', 'ADC', 104, 'LPL', 'LEGENDARY', 'MSI', 99, 102, 96, 98),
('MSI Clearlove', 'EDG', 'JUNGLE', 99, 'LPL', 'LEGENDARY', 'MSI', 88, 95, 98, 96),

-- SKT (T1)
('MSI Faker', 'SKT', 'MID', 105, 'LCK', 'LEGENDARY', 'MSI', 100, 103, 102, 100),
('MSI Duke', 'SKT', 'TOP', 90, 'LCK', 'EPIC', 'MSI', 88, 92, 87, 89),
('MSI Wolf', 'SKT', 'SUPPORT', 100, 'LCK', 'LEGENDARY', 'MSI', 88, 98, 96, 95),

-- RNG
('MSI Uzi', 'RNG', 'ADC', 101, 'LPL', 'LEGENDARY', 'MSI', 98, 100, 95, 97),
('MSI GALA', 'RNG', 'ADC', 99, 'LPL', 'LEGENDARY', 'MSI', 96, 98, 94, 96),
('MSI Xiaohu', 'RNG', 'TOP', 100, 'LPL', 'LEGENDARY', 'MSI', 95, 98, 97, 96),
('MSI Wei', 'RNG', 'JUNGLE', 94, 'LPL', 'EPIC', 'MSI', 89, 93, 92, 91),

-- G2
('MSI Caps', 'G2', 'MID', 102, 'LEC', 'LEGENDARY', 'MSI', 98, 100, 96, 99),
('MSI Jankos', 'G2', 'JUNGLE', 93, 'LEC', 'EPIC', 'MSI', 87, 92, 91, 90),
('MSI Perkz', 'G2', 'ADC', 95, 'LEC', 'EPIC', 'MSI', 92, 94, 91, 93),

-- JDG
('MSI Knight', 'JDG', 'MID', 102, 'LPL', 'LEGENDARY', 'MSI', 99, 100, 97, 98),
('MSI Ruler', 'JDG', 'ADC', 102, 'LPL', 'LEGENDARY', 'MSI', 98, 101, 96, 97),

-- GEN
('MSI Lehends', 'GEN', 'SUPPORT', 101, 'LCK', 'LEGENDARY', 'MSI', 91, 99, 98, 97),
('MSI Peyz', 'GEN', 'ADC', 102, 'LCK', 'LEGENDARY', 'MSI', 98, 100, 96, 98),
('MSI Chovy', 'GEN', 'MID', 103, 'LCK', 'LEGENDARY', 'MSI', 100, 101, 98, 99);

-- Add MSI Champion trait to all MSI cards
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, 'MSI 챔피언', 'Mid-Season Invitational 우승', '+5 모든 스탯'
FROM players WHERE name LIKE 'MSI %';

-- Deft: Consistent Excellence
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '완벽주의자', '꾸준한 고성능', '+10 한타'
FROM players WHERE name = 'MSI Deft';

-- Clearlove: Jungle Mastermind
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '정글 장인', '완벽한 정글 컨트롤', '+12 운영'
FROM players WHERE name = 'MSI Clearlove';

-- Faker: GOAT
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '불패의 신', '역사상 최고의 미드', '+15 모든 스탯'
FROM players WHERE name = 'MSI Faker';

-- Duke: Tank Specialist
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '탱커 장인', '안정적인 탱킹', '+8 라인전'
FROM players WHERE name = 'MSI Duke';

-- Wolf: Support Genius
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '서포팅 장인', '완벽한 서포팅', '+10 한타'
FROM players WHERE name = 'MSI Wolf';

-- Uzi: ADC God
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, 'ADC의 신', '최고의 원딜', '+12 한타'
FROM players WHERE name = 'MSI Uzi';

-- GALA: Teamfight Master
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '한타 마스터', '결정적 한타', '+10 한타'
FROM players WHERE name = 'MSI GALA';

-- Xiaohu: Versatile
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '만능 플레이어', '모든 라인 가능', '+8 모든 스탯'
FROM players WHERE name = 'MSI Xiaohu';

-- Wei: Aggressive Jungler
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '공격적 정글', '적극적인 갱킹', '+8 라인전'
FROM players WHERE name = 'MSI Wei';

-- Caps: Clutch Player
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '클러치 신', '압도적인 캐리력', '+10 한타'
FROM players WHERE name = 'MSI Caps';

-- Jankos: First Blood King
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '퍼블 킹', '초반 주도권 확보', '+8 라인전'
FROM players WHERE name = 'MSI Jankos';

-- Perkz: Roleswap Master
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '적응력', '빠른 적응', '+7 모든 스탯'
FROM players WHERE name = 'MSI Perkz';

-- Knight: Laning God
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '라인전 킹', '압도적인 라인전', '+12 라인전'
FROM players WHERE name = 'MSI Knight';

-- Ruler: World Champion ADC
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '챔피언 원딜', '우승 경험 ADC', '+10 한타'
FROM players WHERE name = 'MSI Ruler';

-- Lehends: Vision Master
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '시야 장인', '완벽한 시야 장악', '+10 운영'
FROM players WHERE name = 'MSI Lehends';

-- Peyz: Rising Star
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '라이징 스타', '떠오르는 신예', '+8 한타'
FROM players WHERE name = 'MSI Peyz';

-- Chovy: Lane Dominator
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '라인 지배자', '라인전 압살', '+12 라인전'
FROM players WHERE name = 'MSI Chovy';
-- Multi-Deck System
-- Allow users to save multiple decks with custom names

USE lol_card_game;

-- Add deck slot number (1-5) and improve deck naming
-- Users can have up to 5 decks
ALTER TABLE decks ADD COLUMN deck_slot INT DEFAULT 1 AFTER user_id;
ALTER TABLE decks ADD COLUMN is_default BOOLEAN DEFAULT FALSE AFTER is_active;

-- Create unique index: one deck per slot per user
CREATE UNIQUE INDEX idx_user_deck_slot ON decks(user_id, deck_slot);

-- Update existing decks to slot 1
UPDATE decks SET deck_slot = 1 WHERE deck_slot IS NULL;

-- Make deck_slot NOT NULL after updating existing data
ALTER TABLE decks MODIFY COLUMN deck_slot INT NOT NULL;

-- Add deck slot constraint (1-5)
ALTER TABLE decks ADD CONSTRAINT chk_deck_slot CHECK (deck_slot BETWEEN 1 AND 5);
-- Add season field to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS season VARCHAR(20) DEFAULT NULL AFTER region;

-- Update existing players with season info based on name
UPDATE players SET season = '25WW' WHERE name LIKE '25WW%';
UPDATE players SET season = '25WUD' WHERE name LIKE '25WUD%';
UPDATE players SET season = '24WW' WHERE name LIKE '24WW%';
UPDATE players SET season = '24WUD' WHERE name LIKE '24WUD%';

-- For players without season prefix, set to 25 (current season)
UPDATE players SET season = '25' WHERE season IS NULL;
-- Add detailed stats to players table
ALTER TABLE players
ADD COLUMN laning INT DEFAULT 50 COMMENT 'Laning phase skill (0-100)',
ADD COLUMN teamfight INT DEFAULT 50 COMMENT 'Teamfight skill (0-100)',
ADD COLUMN macro INT DEFAULT 50 COMMENT 'Macro/strategy skill (0-100)',
ADD COLUMN mental INT DEFAULT 50 COMMENT 'Mental strength/clutch factor (0-100)';

-- Create strategies table
CREATE TABLE IF NOT EXISTS strategies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  laning_weight DECIMAL(3,2) DEFAULT 1.0,
  teamfight_weight DECIMAL(3,2) DEFAULT 1.0,
  macro_weight DECIMAL(3,2) DEFAULT 1.0,
  mental_weight DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default strategies
INSERT INTO strategies (name, description, laning_weight, teamfight_weight, macro_weight, mental_weight) VALUES
('균형', '모든 요소를 균형있게 활용합니다', 1.0, 1.0, 1.0, 1.0),
('라인 압박', '라인전에 집중하여 초반 우위를 가져갑니다', 1.5, 0.8, 0.9, 1.0),
('한타 중심', '한타에서의 승리에 집중합니다', 0.8, 1.5, 0.9, 1.1),
('운영 중심', '맵 장악과 오브젝트 운영에 집중합니다', 0.9, 0.9, 1.5, 1.0),
('정신력 중심', '압박 상황에서의 플레이에 집중합니다', 0.9, 1.0, 0.9, 1.4),
('올인', '모든 것을 걸고 승부합니다', 1.2, 1.2, 0.7, 1.3),
('안정 운영', '안정적인 플레이로 실수를 최소화합니다', 0.9, 0.9, 1.3, 1.2);

-- Create deck strategies table (user's strategy choice per deck)
CREATE TABLE IF NOT EXISTS deck_strategies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deck_id INT NOT NULL,
  strategy_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE,
  UNIQUE KEY unique_deck_strategy (deck_id)
);

-- Update player_traits table structure to include buff/nerf type
ALTER TABLE player_traits
ADD COLUMN trait_type VARCHAR(20) DEFAULT 'BUFF' COMMENT 'BUFF or NERF',
ADD COLUMN stat_affected VARCHAR(20) COMMENT 'laning, teamfight, macro, mental, or overall',
ADD COLUMN value_change INT DEFAULT 0 COMMENT 'Positive for buffs, negative for nerfs';
-- Add special player cards for 2025 Worlds

-- Modify overall column to allow values above 100
ALTER TABLE players MODIFY COLUMN overall INT NOT NULL;

-- 2025 Worlds Winner (25WW) Cards
INSERT INTO players (name, team, position, overall, region, tier, image_url) VALUES
('25WW Doran', 'T1', 'TOP', 90, 'LCK', 'LEGENDARY', NULL),
('25WW Oner', 'T1', 'JUNGLE', 92, 'LCK', 'LEGENDARY', NULL),
('25WW Faker', 'T1', 'MID', 100, 'LCK', 'LEGENDARY', NULL),
('25WW Gumayusi', 'T1', 'ADC', 101, 'LCK', 'LEGENDARY', NULL),
('25WW Keria', 'T1', 'SUPPORT', 99, 'LCK', 'LEGENDARY', NULL);

-- 2025 Worlds Underdog (25WUD) Cards
INSERT INTO players (name, team, position, overall, region, tier, image_url) VALUES
('25WUD PerfecT', 'KT', 'TOP', 86, 'LCK', 'EPIC', NULL),
('25WUD Cuzz', 'KT', 'JUNGLE', 87, 'LCK', 'EPIC', NULL),
('25WUD HongQ', 'CFO', 'MID', 82, 'LCP', 'EPIC', NULL),
('25WUD Doggo', 'CFO', 'ADC', 90, 'LCP', 'EPIC', NULL),
('25WUD Peter', 'KT', 'SUPPORT', 89, 'LCP', 'EPIC', NULL);

-- Add special traits for 25WW cards
-- (We'll add these after getting player IDs)
SET @doran_id = (SELECT id FROM players WHERE name = '25WW Doran');
SET @oner_id = (SELECT id FROM players WHERE name = '25WW Oner');
SET @faker_id = (SELECT id FROM players WHERE name = '25WW Faker');
SET @gumayusi_id = (SELECT id FROM players WHERE name = '25WW Gumayusi');
SET @keria_id = (SELECT id FROM players WHERE name = '25WW Keria');

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@doran_id, 'Worlds Champion', '2025 Worlds Winner', '+10% All Stats'),
(@oner_id, 'Worlds Champion', '2025 Worlds Winner', '+10% All Stats'),
(@faker_id, 'GOAT', 'The Greatest Of All Time', '+15% All Stats'),
(@gumayusi_id, 'Worlds Champion', '2025 Worlds Winner', '+10% All Stats'),
(@keria_id, 'Worlds Champion', '2025 Worlds Winner', '+10% All Stats');

-- Add special traits for 25WUD cards
SET @perfect_id = (SELECT id FROM players WHERE name = '25WUD PerfecT');
SET @cuzz_id = (SELECT id FROM players WHERE name = '25WUD Cuzz');
SET @hongq_id = (SELECT id FROM players WHERE name = '25WUD HongQ');
SET @doggo_id = (SELECT id FROM players WHERE name = '25WUD Doggo');
SET @peter_id = (SELECT id FROM players WHERE name = '25WUD Peter');

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@perfect_id, 'Underdog Spirit', 'Worlds Underdog Story', '+8% All Stats'),
(@cuzz_id, 'Underdog Spirit', 'Worlds Underdog Story', '+8% All Stats'),
(@hongq_id, 'Underdog Spirit', 'Worlds Underdog Story', '+8% All Stats'),
(@doggo_id, 'Underdog Spirit', 'Worlds Underdog Story', '+8% All Stats'),
(@peter_id, 'Underdog Spirit', 'Worlds Underdog Story', '+8% All Stats');
-- Add streak columns to user_stats table

ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0 AFTER losses,
ADD COLUMN IF NOT EXISTS longest_win_streak INT DEFAULT 0 AFTER current_streak;

-- Update existing rows to have default values
UPDATE user_stats SET current_streak = 0 WHERE current_streak IS NULL;
UPDATE user_stats SET longest_win_streak = 0 WHERE longest_win_streak IS NULL;
-- players 테이블에 특성 컬럼 추가
ALTER TABLE players
ADD COLUMN trait1 VARCHAR(50) DEFAULT NULL,
ADD COLUMN trait2 VARCHAR(50) DEFAULT NULL,
ADD COLUMN trait3 VARCHAR(50) DEFAULT NULL;

-- 인덱스 추가 (검색 최적화)
CREATE INDEX idx_trait1 ON players(trait1);
CREATE INDEX idx_trait2 ON players(trait2);
CREATE INDEX idx_trait3 ON players(trait3);

-- 확인
DESCRIBE players;
-- WCP (World Championship Pentakill) Cards
-- 월드 챔피언쉽에서 펜타킬을 달성한 선수들

-- 지역 결정: SSG/GRF/HLE/SN/BLG/DK/T1/GAM = LCK/LPL, FNC/OG/FB/SUP/BDS = LEC, C9 = LCS, FW/SGB = PCS, LYON/INF/LOUD = LATAM

INSERT INTO players (
  name, team, position, overall, region, season,
  laning, teamfight, macro, mental,
  cs_ability, lane_pressure, damage_dealing, survivability,
  objective_control, vision_control, decision_making, consistency,
  salary
) VALUES
-- SSG IMP - ADC - 109 (2014 Worlds Pentakill)
('WCP IMP', 'SSG', 'ADC', 109, 'LCK', 'WCP',
  100, 108, 102, 105,
  105, 100, 110, 98, 102, 95, 100, 104, 25),

-- FNC Rekkles - ADC - 108 (2017 Worlds Pentakill)
('WCP Rekkles', 'FNC', 'ADC', 108, 'LEC', 'WCP',
  102, 107, 105, 110,
  108, 98, 105, 108, 100, 96, 105, 110, 24),

-- C9 Balls - TOP - 105 (2015 Worlds Pentakill)
('WCP Balls', 'C9', 'TOP', 105, 'LCS', 'WCP',
  98, 106, 100, 102,
  100, 102, 105, 100, 98, 90, 98, 102, 22),

-- FW NL - ADC - 93 (2015 Worlds Pentakill)
('WCP NL', 'FW', 'ADC', 93, 'LCP', 'WCP',
  88, 95, 85, 90,
  90, 85, 95, 88, 82, 80, 88, 85, 17),

-- OG sOAZ - TOP - 101 (2015 Worlds Pentakill)
('WCP sOAZ', 'OG', 'TOP', 101, 'LEC', 'WCP',
  96, 100, 98, 95,
  95, 98, 98, 95, 95, 88, 96, 92, 20),

-- LYON WhiteLotus - ADC - 92 (2017 Worlds Pentakill)
('WCP WhiteLotus', 'LYON', 'ADC', 92, 'LTA', 'WCP',
  85, 94, 82, 88,
  88, 82, 95, 85, 80, 78, 85, 82, 17),

-- FB Padden - ADC - 90 (2017 Worlds Pentakill)
('WCP Padden', 'FB', 'ADC', 90, 'LEC', 'WCP',
  82, 92, 80, 85,
  85, 80, 92, 82, 78, 75, 82, 80, 16),

-- INF Renyu - ADC - 88 (2018 Worlds Pentakill)
('WCP Renyu', 'INF', 'ADC', 88, 'LTA', 'WCP',
  80, 90, 78, 82,
  82, 78, 90, 80, 76, 72, 80, 78, 15),

-- SUP Zeitnot - ADC - 80 (2019 Worlds Pentakill)
('WCP Zeitnot', 'SUP', 'ADC', 80, 'LEC', 'WCP',
  70, 82, 72, 75,
  75, 68, 82, 72, 68, 65, 72, 70, 12),

-- GRF Viper - ADC - 100 (2019 Worlds Pentakill)
('WCP Viper', 'GRF', 'ADC', 100, 'LCK', 'WCP',
  95, 100, 96, 98,
  98, 92, 102, 95, 92, 88, 95, 96, 20),

-- SN Bin - TOP - 105 (2020 Worlds Pentakill)
('WCP Bin', 'SN', 'TOP', 105, 'LPL', 'WCP',
  100, 105, 95, 100,
  98, 105, 102, 95, 95, 85, 98, 95, 22),

-- DK Khan - TOP - 111 (2021 Worlds Pentakill)
('WCP Khan', 'DK', 'TOP', 111, 'LCK', 'WCP',
  105, 108, 105, 108,
  108, 108, 105, 105, 105, 95, 108, 105, 26),

-- FNC Upset - ADC - 103 (2022 Worlds Pentakill)
('WCP Upset', 'FNC', 'ADC', 103, 'LEC', 'WCP',
  98, 102, 95, 100,
  100, 95, 105, 98, 92, 88, 98, 100, 22),

-- SGB Shogun - ADC - 93 (2022 Worlds Pentakill)
('WCP Shogun', 'SGB', 'ADC', 93, 'LCP', 'WCP',
  85, 95, 85, 90,
  90, 82, 96, 88, 82, 78, 88, 85, 17),

-- LOUD Route - ADC - 93 (2022 Worlds Pentakill)
('WCP Route', 'LOUD', 'ADC', 93, 'LTA', 'WCP',
  86, 94, 86, 88,
  88, 84, 95, 86, 80, 76, 86, 84, 18),

-- GAM Slayder - ADC - 90 (2023 Worlds Pentakill)
('WCP Slayder', 'GAM', 'ADC', 90, 'LCP', 'WCP',
  82, 92, 80, 85,
  85, 80, 92, 82, 78, 75, 82, 80, 17),

-- BDS Crownie - ADC - 102 (2024 Worlds Pentakill)
('WCP Crownie', 'BDS', 'ADC', 102, 'LEC', 'WCP',
  96, 100, 95, 98,
  98, 94, 102, 96, 90, 86, 95, 98, 20);


-- Add WCP Pentakill trait to all WCP cards
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '월드 펜타킬', '월드 챔피언쉽에서 펜타킬 달성', '+8 한타'
FROM players WHERE name LIKE 'WCP %';

-- Individual Traits

-- IMP: SSG World Champion ADC
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '최강 딜러', '압도적인 팀파이트 캐리력', '+12 한타'
FROM players WHERE name = 'WCP IMP';

-- Rekkles: Consistent ADC Master
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '안정의 아이콘', '흔들리지 않는 안정성', '+10 멘탈'
FROM players WHERE name = 'WCP Rekkles';

-- Balls: The Darius Pentakill Legend
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '다리우스 신화', '전설적인 다리우스 펜타킬', '+12 한타'
FROM players WHERE name = 'WCP Balls';

-- NL: Flash Wolves ADC
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '대만의 자존심', 'LMS 최고의 원딜', '+8 딜량'
FROM players WHERE name = 'WCP NL';

-- sOAZ: Veteran Top Laner
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '역대급 베테랑', '오랜 경험의 안정감', '+10 운영'
FROM players WHERE name = 'WCP sOAZ';

-- WhiteLotus: LATAM Legend
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '라틴의 영웅', 'LATAM 리전의 전설', '+8 딜량'
FROM players WHERE name = 'WCP WhiteLotus';

-- Padden: Turkish ADC
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '터키의 희망', 'TCL 최고의 원딜', '+7 한타'
FROM players WHERE name = 'WCP Padden';

-- Renyu: Infinity eSports Star
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '라틴 신예', 'LATAM의 떠오르는 별', '+7 딜량'
FROM players WHERE name = 'WCP Renyu';

-- Zeitnot: SuperMassive ADC
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '와일드카드 원딜', '와일드카드 팀의 에이스', '+6 한타'
FROM players WHERE name = 'WCP Zeitnot';

-- Viper: Perfect Teamfighter
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '완벽한 포지셔닝', '흠잡을 데 없는 팀파이트', '+12 한타'
FROM players WHERE name = 'WCP Viper';

-- Bin: Aggressive Top
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '공격적 탑', '상대를 압도하는 라인전', '+10 라인전'
FROM players WHERE name = 'WCP Bin';

-- Khan: The Top Lane God
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '탑신 칸', '탑 라인의 지배자', '+15 라인전'
FROM players WHERE name = 'WCP Khan';

-- Upset: FNC Star ADC
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, 'FNC의 에이스', 'EU 최고의 원딜', '+10 한타'
FROM players WHERE name = 'WCP Upset';

-- Shogun: VCS Representative
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '베트남의 총', '공격적인 플레이', '+8 딜량'
FROM players WHERE name = 'WCP Shogun';

-- Route: LOUD Superstar
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, 'CBLOL의 희망', '브라질의 에이스', '+8 한타'
FROM players WHERE name = 'WCP Route';

-- Slayder: GAM Star
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, 'VCS의 별', '베트남의 떠오르는 별', '+7 딜량'
FROM players WHERE name = 'WCP Slayder';

-- Crownie: BDS Clutch Player
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '클러치 플레이어', '결정적 순간의 영웅', '+10 한타'
FROM players WHERE name = 'WCP Crownie';


-- Add WCP cards to market (높은 가격 - 레전드 티어급 희귀 카드)
INSERT INTO player_market_prices (player_id, base_price, current_price, price_floor, price_ceiling)
SELECT
  id,
  CASE
    WHEN overall >= 110 THEN 8000
    WHEN overall >= 105 THEN 6000
    WHEN overall >= 100 THEN 4500
    WHEN overall >= 95 THEN 3500
    WHEN overall >= 90 THEN 2500
    ELSE 1800
  END as base_price,
  CASE
    WHEN overall >= 110 THEN 8000
    WHEN overall >= 105 THEN 6000
    WHEN overall >= 100 THEN 4500
    WHEN overall >= 95 THEN 3500
    WHEN overall >= 90 THEN 2500
    ELSE 1800
  END as current_price,
  CASE
    WHEN overall >= 110 THEN 6000
    WHEN overall >= 105 THEN 4500
    WHEN overall >= 100 THEN 3500
    WHEN overall >= 95 THEN 2500
    WHEN overall >= 90 THEN 1800
    ELSE 1200
  END as price_floor,
  CASE
    WHEN overall >= 110 THEN 12000
    WHEN overall >= 105 THEN 9000
    WHEN overall >= 100 THEN 6500
    WHEN overall >= 95 THEN 5000
    WHEN overall >= 90 THEN 3500
    ELSE 2500
  END as price_ceiling
FROM players
WHERE name LIKE 'WCP %'
ON DUPLICATE KEY UPDATE
  base_price = VALUES(base_price),
  current_price = VALUES(current_price),
  price_floor = VALUES(price_floor),
  price_ceiling = VALUES(price_ceiling);
-- Add welcome packs system
-- Gives new users 5 free special packs containing only 25WW, 25WUD, and 19G2 cards

USE lol_card_game;

-- Check if column exists, if not add it
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lol_card_game'
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'welcome_packs_remaining'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE users ADD COLUMN welcome_packs_remaining INT DEFAULT 5 AFTER is_admin',
  'SELECT "Column already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Set 5 welcome packs for all existing users (compensation)
UPDATE users SET welcome_packs_remaining = 5 WHERE welcome_packs_remaining IS NULL OR welcome_packs_remaining = 0;

-- Verify
SELECT id, username, welcome_packs_remaining FROM users LIMIT 10;
