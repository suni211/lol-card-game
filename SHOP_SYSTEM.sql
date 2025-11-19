-- 포인트 상점 시스템 완전 초기화 및 재설정

-- 기존 데이터 삭제 (순서 중요: 외래키 때문에 역순으로)
DELETE FROM item_usage_log;
DELETE FROM user_items;
DELETE FROM shop_items;

-- 상점 아이템 테이블
CREATE TABLE IF NOT EXISTS shop_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price INT NOT NULL,
  item_type ENUM('consumable', 'permanent', 'pack') NOT NULL,
  effect_type VARCHAR(50),
  effect_value VARCHAR(100),
  duration_minutes INT DEFAULT 0,
  stock_limit INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_active (is_active)
);

-- 유저 아이템 보관함
CREATE TABLE IF NOT EXISTS user_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  item_id INT NOT NULL,
  quantity INT DEFAULT 1,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

-- 아이템 사용 로그
CREATE TABLE IF NOT EXISTS item_usage_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  item_id INT NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  effect_expires_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE,
  INDEX idx_user_expiry (user_id, effect_expires_at)
);

-- AUTO_INCREMENT 리셋
ALTER TABLE shop_items AUTO_INCREMENT = 1;
ALTER TABLE user_items AUTO_INCREMENT = 1;
ALTER TABLE item_usage_log AUTO_INCREMENT = 1;

-- 상점 아이템 추가 (4개만 깔끔하게)
INSERT INTO shop_items (name, description, price, item_type, effect_type, effect_value, duration_minutes) VALUES
('강화 하락 방지권', '강화 실패 시 레벨이 하락하지 않습니다 (1회용)', 100000, 'consumable', 'protection', 'no_downgrade', 0),
('경험치 2배 부스터', '1시간 동안 경험치 획득량이 2배가 됩니다', 20000, 'consumable', 'exp_boost', '2', 60),
('포인트 2배 부스터', '1시간 동안 포인트 획득량이 2배가 됩니다', 25000, 'consumable', 'points_boost', '2', 60),
('이름 변경권', '사용자 이름을 변경할 수 있습니다', 15000, 'consumable', 'name_change', '1', 0);

-- 확인
SELECT 'Shop system tables created successfully' as status;
SELECT COUNT(*) as total_items FROM shop_items;
