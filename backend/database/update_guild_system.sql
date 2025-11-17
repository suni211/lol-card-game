-- 길드 가입 신청 테이블 추가
CREATE TABLE IF NOT EXISTS guild_join_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guild_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED') DEFAULT 'PENDING',
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_guild_user_request (guild_id, user_id, status),
    INDEX idx_guild_status (guild_id, status),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 길드 테이블에 자동 가입 설정 추가
ALTER TABLE guilds
ADD COLUMN IF NOT EXISTS auto_accept BOOLEAN DEFAULT FALSE COMMENT '자동 가입 수락 여부';
