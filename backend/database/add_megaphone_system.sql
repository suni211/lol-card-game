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
