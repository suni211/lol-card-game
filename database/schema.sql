-- 2026 clean-install schema for LOL Card Game.
-- DDL only, with limited neutral defaults. Historical player seeds are intentionally omitted.
-- The three active series are inserted by database/migrations/2026_live_worlds.sql
-- and database/migrations/2026_global_tier1_live.sql.
-- IMPORTANT: Only use for new database initialization; this is not an upgrade migration.
CREATE DATABASE IF NOT EXISTS lol_card_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lol_card_game;

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

CREATE TABLE players (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    team VARCHAR(50) NOT NULL,
    position ENUM('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT') NOT NULL,
    overall INT NOT NULL CHECK (overall >= 50 AND overall <= 120),
    region ENUM('LCK', 'LTA', 'LPL', 'LEC', 'LCP', 'LCS', 'CBLOL') NOT NULL,
    tier ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'ICON', 'GR') NOT NULL DEFAULT 'COMMON',
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

CREATE TABLE player_traits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    effect VARCHAR(100),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_player_id (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE missions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  type ENUM('DAILY','WEEKLY','MONTHLY') NOT NULL,
  mission_type VARCHAR(20) NOT NULL DEFAULT 'ai_battle',
  requirement INT NOT NULL,
  reward INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_missions (
  id INT PRIMARY KEY AUTO_INCREMENT,
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
  UNIQUE KEY unique_user_mission (user_id, mission_id, expires_at),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS collection_milestones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    required_cards INT NOT NULL, -- same threshold can appear in different milestone categories
    reward_points INT NOT NULL, -- 보상 포인트
    milestone_type ENUM('TOTAL', 'TIER', 'SEASON', 'TEAM') DEFAULT 'TOTAL',
    filter_value VARCHAR(50), -- TIER면 'LEGENDARY', SEASON이면 '2024', TEAM이면 'T1' 등
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_required_cards (required_cards)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE INDEX idx_coupon_code ON coupons(code);

CREATE INDEX idx_coupon_active ON coupons(is_active);

CREATE INDEX idx_redemption_user ON coupon_redemptions(user_id);

CREATE INDEX idx_redemption_coupon ON coupon_redemptions(coupon_id);

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

CREATE TABLE IF NOT EXISTS gacha_mileage (
    user_id INT PRIMARY KEY,
    mileage_points INT NOT NULL DEFAULT 0,
    last_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

ALTER TABLE users
ADD COLUMN IF NOT EXISTS guild_id INT DEFAULT NULL,
ADD FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE SET NULL;

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

ALTER TABLE users
ADD COLUMN IF NOT EXISTS level INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS exp INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_exp INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS level_rewards (
    level INT PRIMARY KEY,
    required_exp INT NOT NULL, -- 이 레벨에 도달하기 위한 누적 경험치
    reward_points INT NOT NULL, -- 레벨업 시 받는 포인트
    reward_description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS price_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  player_id INT NOT NULL,
  price INT NOT NULL,
  transaction_id INT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES market_transactions(id) ON DELETE SET NULL
);

CREATE INDEX idx_market_transactions_status ON market_transactions(status);

CREATE INDEX idx_market_transactions_player ON market_transactions(player_id);

CREATE INDEX idx_market_transactions_seller ON market_transactions(seller_id);

CREATE INDEX idx_price_history_player ON price_history(player_id);

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

ALTER TABLE players ADD COLUMN trait1_effect TEXT DEFAULT NULL;

ALTER TABLE players ADD COLUMN trait2_effect TEXT DEFAULT NULL;

ALTER TABLE players ADD COLUMN trait3_effect TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS gacha_packs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    pack_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

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

ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS ai_wins INT DEFAULT 0 COMMENT 'AI 배틀 승리 횟수',
ADD COLUMN IF NOT EXISTS ai_losses INT DEFAULT 0 COMMENT 'AI 배틀 패배 횟수';

CREATE INDEX IF NOT EXISTS idx_user_stats_ai ON user_stats(user_id, ai_wins, ai_losses);

ALTER TABLE user_cards
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE AFTER level;

ALTER TABLE user_coaches
ADD COLUMN enhancement_level INT DEFAULT 0 COMMENT '강화 레벨 (최대 10)';

ALTER TABLE user_coaches
ADD COLUMN current_buff_value INT DEFAULT NULL COMMENT '현재 강화된 버프 값 (NULL이면 기본값 사용)';

ALTER TABLE players
ADD COLUMN IF NOT EXISTS cs_ability INT DEFAULT 50 COMMENT 'CS 수급 능력',
ADD COLUMN IF NOT EXISTS lane_pressure INT DEFAULT 50 COMMENT '라인전 압박력',
ADD COLUMN IF NOT EXISTS damage_dealing INT DEFAULT 50 COMMENT '딜량 기여도',
ADD COLUMN IF NOT EXISTS survivability INT DEFAULT 50 COMMENT '생존력',
ADD COLUMN IF NOT EXISTS objective_control INT DEFAULT 50 COMMENT '오브젝트 관리',
ADD COLUMN IF NOT EXISTS vision_control INT DEFAULT 50 COMMENT '시야 장악',
ADD COLUMN IF NOT EXISTS decision_making INT DEFAULT 50 COMMENT '판단력',
ADD COLUMN IF NOT EXISTS consistency INT DEFAULT 50 COMMENT '안정성';

ALTER TABLE players
MODIFY COLUMN tier ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'ICON', 'GR') NOT NULL DEFAULT 'COMMON';

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE users
ADD COLUMN isAdmin BOOLEAN NOT NULL DEFAULT FALSE AFTER email;

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

CREATE TABLE IF NOT EXISTS user_megaphones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY (user_id)
);

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

ALTER TABLE decks ADD COLUMN deck_slot INT DEFAULT 1 AFTER user_id;

ALTER TABLE decks ADD COLUMN is_default BOOLEAN DEFAULT FALSE AFTER is_active;

CREATE UNIQUE INDEX idx_user_deck_slot ON decks(user_id, deck_slot);

ALTER TABLE decks MODIFY COLUMN deck_slot INT NOT NULL;

ALTER TABLE decks ADD CONSTRAINT chk_deck_slot CHECK (deck_slot BETWEEN 1 AND 5);

ALTER TABLE players ADD COLUMN IF NOT EXISTS season VARCHAR(20) DEFAULT NULL AFTER region;

ALTER TABLE players
ADD COLUMN laning INT DEFAULT 50 COMMENT 'Laning phase skill (0-100)',
ADD COLUMN teamfight INT DEFAULT 50 COMMENT 'Teamfight skill (0-100)',
ADD COLUMN macro INT DEFAULT 50 COMMENT 'Macro/strategy skill (0-100)',
ADD COLUMN mental INT DEFAULT 50 COMMENT 'Mental strength/clutch factor (0-100)';

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

ALTER TABLE player_traits
ADD COLUMN trait_type VARCHAR(20) DEFAULT 'BUFF' COMMENT 'BUFF or NERF',
ADD COLUMN stat_affected VARCHAR(20) COMMENT 'laning, teamfight, macro, mental, or overall',
ADD COLUMN value_change INT DEFAULT 0 COMMENT 'Positive for buffs, negative for nerfs';

ALTER TABLE players MODIFY COLUMN overall INT NOT NULL;

ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0 AFTER losses,
ADD COLUMN IF NOT EXISTS longest_win_streak INT DEFAULT 0 AFTER current_streak;

ALTER TABLE players
ADD COLUMN trait1 VARCHAR(50) DEFAULT NULL,
ADD COLUMN trait2 VARCHAR(50) DEFAULT NULL,
ADD COLUMN trait3 VARCHAR(50) DEFAULT NULL;

CREATE INDEX idx_trait1 ON players(trait1);

CREATE INDEX idx_trait2 ON players(trait2);

CREATE INDEX idx_trait3 ON players(trait3);

ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_packs_remaining INT NOT NULL DEFAULT 0;

-- Modern defaults only (no historical player cards).
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
