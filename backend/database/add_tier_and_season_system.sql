-- Add tier suspension and season system

-- Add tier_suspended_until column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS tier_suspended_until DATETIME DEFAULT NULL AFTER tier;

-- Update default rating to 1000 if needed
UPDATE users SET rating = GREATEST(rating, 1000);

-- Create seasons table
CREATE TABLE IF NOT EXISTS seasons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert first season
INSERT INTO seasons (name, start_date, is_active)
VALUES ('Season 1', NOW(), TRUE)
ON DUPLICATE KEY UPDATE is_active = is_active;

-- Create user_season_stats table for historical records
CREATE TABLE IF NOT EXISTS user_season_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    season_id INT NOT NULL,
    final_tier VARCHAR(20) NOT NULL,
    final_rating INT NOT NULL,
    total_matches INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_season (user_id, season_id),
    INDEX idx_user_id (user_id),
    INDEX idx_season_id (season_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
