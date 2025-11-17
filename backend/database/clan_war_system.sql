-- 클랜전 시스템 테이블

-- 클랜전 시즌 (주간 단위)
CREATE TABLE IF NOT EXISTS clan_war_seasons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    season_number INT NOT NULL UNIQUE,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    status ENUM('UPCOMING', 'ACTIVE', 'COMPLETED') DEFAULT 'UPCOMING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status_dates (status, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 클랜전 매치 (길드원 vs 다른 길드원)
CREATE TABLE IF NOT EXISTS clan_war_matches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    season_id INT NOT NULL,
    guild1_id INT NOT NULL,
    guild2_id INT NOT NULL,
    player1_id INT NOT NULL COMMENT '길드1의 플레이어',
    player2_id INT NOT NULL COMMENT '길드2의 플레이어',
    player1_deck_id INT,
    player2_deck_id INT,
    winner_id INT,
    player1_score INT DEFAULT 0,
    player2_score INT DEFAULT 0,
    status ENUM('WAITING', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'WAITING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (season_id) REFERENCES clan_war_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (guild1_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (guild2_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_season_status (season_id, status),
    INDEX idx_guilds (guild1_id, guild2_id),
    INDEX idx_players (player1_id, player2_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 클랜전 시즌별 길드 통계
CREATE TABLE IF NOT EXISTS clan_war_guild_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    season_id INT NOT NULL,
    guild_id INT NOT NULL,
    total_matches INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    total_points INT DEFAULT 0 COMMENT '승리당 3점, 무승부 1점',
    total_damage INT DEFAULT 0,
    rank_position INT,
    reward_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES clan_war_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    UNIQUE KEY unique_season_guild (season_id, guild_id),
    INDEX idx_season_rank (season_id, rank_position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 클랜전 개인 기여도
CREATE TABLE IF NOT EXISTS clan_war_contributions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    season_id INT NOT NULL,
    guild_id INT NOT NULL,
    user_id INT NOT NULL,
    matches_played INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    total_damage INT DEFAULT 0,
    contribution_points INT DEFAULT 0 COMMENT '승리당 100점',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES clan_war_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_season_guild_user (season_id, guild_id, user_id),
    INDEX idx_guild_contribution (guild_id, contribution_points DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 현재 활성화된 시즌 생성
INSERT INTO clan_war_seasons (season_number, start_date, end_date, status)
VALUES (
    1,
    DATE_SUB(NOW(), INTERVAL (WEEKDAY(NOW())) DAY),
    DATE_ADD(DATE_SUB(NOW(), INTERVAL (WEEKDAY(NOW())) DAY), INTERVAL 7 DAY),
    'ACTIVE'
) ON DUPLICATE KEY UPDATE season_number = season_number;
