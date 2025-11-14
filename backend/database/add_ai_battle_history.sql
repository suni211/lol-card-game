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
