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
