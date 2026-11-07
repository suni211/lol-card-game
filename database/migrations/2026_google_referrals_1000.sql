-- Apply to the existing lol_card_game database before deploying the referral patch.
-- Additive migration only: does not delete existing accounts or player data.
USE lol_card_game;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_username_change DATETIME NULL,
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS total_referrals INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_referral_bonus INT NOT NULL DEFAULT 0;

-- Existing members receive their own persistent shareable invite code.
UPDATE users SET referral_code = CONCAT('LCG', LPAD(id, 8, '0'))
WHERE referral_code IS NULL OR referral_code = '';

SET @referral_index_exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'users'
    AND index_name = 'uq_users_referral_code'
);
SET @referral_index_sql = IF(@referral_index_exists = 0,
  'CREATE UNIQUE INDEX uq_users_referral_code ON users(referral_code)', 'SELECT 1');
PREPARE stmt FROM @referral_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id INT NOT NULL,
  referred_id INT NOT NULL,
  signup_bonus_points INT NOT NULL DEFAULT 1000,
  total_match_bonus INT NOT NULL DEFAULT 0,
  referred_match_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_referrals_referred (referred_id),
  KEY idx_referrals_referrer (referrer_id),
  CONSTRAINT fk_referrals_referrer FOREIGN KEY (referrer_id) REFERENCES users(id),
  CONSTRAINT fk_referrals_referred FOREIGN KEY (referred_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS referral_bonuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id INT NOT NULL,
  referred_id INT NOT NULL,
  bonus_type VARCHAR(20) NOT NULL,
  referrer_bonus INT NOT NULL DEFAULT 0,
  referred_bonus INT NOT NULL DEFAULT 0,
  match_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_referral_bonus_once (referred_id, bonus_type),
  KEY idx_referral_bonus_referrer (referrer_id),
  CONSTRAINT fk_referral_bonus_referrer FOREIGN KEY (referrer_id) REFERENCES users(id),
  CONSTRAINT fk_referral_bonus_referred FOREIGN KEY (referred_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
