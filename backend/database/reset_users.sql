-- Reset Users Table
-- WARNING: This will delete ALL user data!

USE lol_card_game;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Drop related tables first
DROP TABLE IF EXISTS user_stats;
DROP TABLE IF EXISTS user_cards;
DROP TABLE IF EXISTS decks;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS gacha_history;
DROP TABLE IF EXISTS missions;
DROP TABLE IF EXISTS user_missions;
DROP TABLE IF EXISTS trades;
DROP TABLE IF EXISTS trade_cards;
DROP TABLE IF EXISTS notices;

-- Drop and recreate users table with new schema
DROP TABLE IF EXISTS users;

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

-- Recreate user_stats table
CREATE TABLE user_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    total_matches INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    highest_rating INT DEFAULT 1000,
    total_cards INT DEFAULT 0,
    legendary_cards INT DEFAULT 0,
    epic_cards INT DEFAULT 0,
    rare_cards INT DEFAULT 0,
    common_cards INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recreate user_cards table
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

-- Recreate decks table
CREATE TABLE decks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(100) DEFAULT 'My Deck',
    top_card_id INT,
    jungle_card_id INT,
    mid_card_id INT,
    adc_card_id INT,
    support_card_id INT,
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

-- Recreate gacha_history table
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

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Users table reset complete!' AS status;
