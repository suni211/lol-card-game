-- Migration: Update players table schema
USE lol_card_game;

-- Add new columns to players table (with IF NOT EXISTS check)
ALTER TABLE players ADD COLUMN IF NOT EXISTS season VARCHAR(20) AFTER region;
ALTER TABLE players ADD COLUMN IF NOT EXISTS market_value INT DEFAULT 0 AFTER season;

-- Add index if not exists
CREATE INDEX IF NOT EXISTS idx_season ON players(season);

-- Create player_stats table
CREATE TABLE IF NOT EXISTS player_stats (
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

-- Create player_teams table
CREATE TABLE IF NOT EXISTS player_teams (
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

SELECT 'Schema migration completed successfully!' as Status;
