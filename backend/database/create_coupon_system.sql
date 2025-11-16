-- 쿠폰 시스템 테이블 생성

-- 쿠폰 테이블
CREATE TABLE IF NOT EXISTS coupons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  type ENUM('POINTS', 'CARD', 'PACK') NOT NULL,
  reward_value INT NULL,  -- POINTS일 때 포인트 양
  reward_player_id INT NULL,  -- CARD일 때 플레이어 ID
  reward_pack_type VARCHAR(20) NULL,  -- PACK일 때 팩 종류
  reward_pack_count INT DEFAULT 1,  -- PACK일 때 팩 개수
  max_uses INT DEFAULT 1,  -- 최대 사용 횟수 (1 = 1회용, NULL = 무제한)
  current_uses INT DEFAULT 0,  -- 현재 사용된 횟수
  expires_at DATETIME NULL,  -- 만료 시간
  created_by INT NOT NULL,  -- 생성한 관리자 ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  description VARCHAR(255) NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (reward_player_id) REFERENCES players(id)
);

-- 쿠폰 사용 이력 테이블
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  coupon_id INT NOT NULL,
  user_id INT NOT NULL,
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reward_type ENUM('POINTS', 'CARD', 'PACK') NOT NULL,
  reward_details TEXT NULL,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_user_coupon (user_id, coupon_id)  -- 사용자당 1회만 사용 가능
);

-- 인덱스 추가
CREATE INDEX idx_coupon_code ON coupons(code);
CREATE INDEX idx_coupon_active ON coupons(is_active);
CREATE INDEX idx_redemption_user ON coupon_redemptions(user_id);
CREATE INDEX idx_redemption_coupon ON coupon_redemptions(coupon_id);
