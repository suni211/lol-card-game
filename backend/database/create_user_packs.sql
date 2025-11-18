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
