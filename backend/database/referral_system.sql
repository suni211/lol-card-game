-- 친구 추천 시스템 테이블
CREATE TABLE IF NOT EXISTS referrals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referrer_id INT NOT NULL COMMENT '추천한 사람 ID',
    referred_id INT NOT NULL COMMENT '추천받은 사람 ID',
    referrer_ip VARCHAR(45) NOT NULL COMMENT '추천한 사람 IP',
    referred_ip VARCHAR(45) NOT NULL COMMENT '추천받은 사람 IP',
    signup_bonus_points INT DEFAULT 500 COMMENT '가입 보너스 포인트',
    total_match_bonus INT DEFAULT 0 COMMENT '누적 매치 보너스',
    referred_match_count INT DEFAULT 0 COMMENT '추천받은 사람의 총 매치 수',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_bonus_at TIMESTAMP NULL COMMENT '마지막 보너스 지급 시간',
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_referred (referred_id),
    INDEX idx_referrer (referrer_id),
    INDEX idx_referred_matches (referred_id, referred_match_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 추천 보너스 히스토리
CREATE TABLE IF NOT EXISTS referral_bonuses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referral_id INT NOT NULL,
    referrer_id INT NOT NULL,
    referred_id INT NOT NULL,
    bonus_type ENUM('SIGNUP', 'MATCH_1', 'MATCH_5', 'MATCH_10', 'MATCH_20', 'MATCH_50', 'MATCH_100') NOT NULL,
    referrer_bonus INT NOT NULL COMMENT '추천한 사람 보너스',
    referred_bonus INT NOT NULL COMMENT '추천받은 사람 보너스',
    match_count INT DEFAULT 0 COMMENT '해당 시점의 매치 수',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_referral (referral_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- users 테이블에 추천 관련 컬럼 추가
ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE COMMENT '내 추천 코드',
ADD COLUMN IF NOT EXISTS total_referrals INT DEFAULT 0 COMMENT '총 추천 인원',
ADD COLUMN IF NOT EXISTS total_referral_bonus INT DEFAULT 0 COMMENT '총 추천 보너스',
ADD COLUMN IF NOT EXISTS registration_ip VARCHAR(45) COMMENT '가입 IP';

-- 기존 유저들에게 추천 코드 생성 (username 기반)
UPDATE users
SET referral_code = CONCAT(UPPER(SUBSTRING(username, 1, 8)), LPAD(id, 4, '0'))
WHERE referral_code IS NULL;
