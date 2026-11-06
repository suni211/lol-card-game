-- Additive 2026 compatibility for legacy shop, title, raid and referral menus.
-- Existing accounts, card inventory and transaction records are not deleted.
USE lol_card_game;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS equipped_title_id INT NULL,
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS total_referrals INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_referral_bonus INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS titles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  color VARCHAR(20) DEFAULT '#3B82F6',
  icon VARCHAR(100) NULL,
  rarity ENUM('COMMON','RARE','EPIC','LEGENDARY','SPECIAL') NOT NULL DEFAULT 'COMMON',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_titles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title_id INT NOT NULL,
  equipped BOOLEAN NOT NULL DEFAULT FALSE,
  acquired_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_title (user_id,title_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shop_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price INT NOT NULL DEFAULT 0,
  item_type VARCHAR(50) NOT NULL DEFAULT 'CONSUMABLE',
  effect_type VARCHAR(50) NOT NULL DEFAULT 'none',
  effect_value VARCHAR(100) NULL,
  duration_minutes INT NOT NULL DEFAULT 0,
  stock_limit INT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  item_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  purchased_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_item (user_id,item_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS item_usage_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  item_id INT NOT NULL,
  used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effect_expires_at DATETIME NULL,
  INDEX idx_user_effects (user_id,effect_expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS raid_bosses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  current_hp BIGINT NOT NULL,
  max_hp BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  reward_multiplier DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS raid_participants (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  raid_boss_id INT NOT NULL,
  user_id INT NOT NULL,
  damage_dealt BIGINT NOT NULL DEFAULT 0,
  attempts INT NOT NULL DEFAULT 0,
  last_attack_at DATETIME NULL,
  UNIQUE KEY uq_raid_participant (raid_boss_id,user_id),
  FOREIGN KEY (raid_boss_id) REFERENCES raid_bosses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS referrals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  referrer_id INT NOT NULL,
  referred_id INT NOT NULL,
  referrer_ip VARCHAR(64) NULL,
  referred_ip VARCHAR(64) NULL,
  signup_bonus_points INT NOT NULL DEFAULT 0,
  total_match_bonus INT NOT NULL DEFAULT 0,
  referred_match_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_referred_user (referred_id),
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS referral_bonuses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  referral_id BIGINT NULL,
  referrer_id INT NOT NULL,
  referred_id INT NOT NULL,
  bonus_type VARCHAR(30) NOT NULL,
  referrer_bonus INT NOT NULL DEFAULT 0,
  referred_bonus INT NOT NULL DEFAULT 0,
  match_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE SET NULL,
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The shop intentionally starts empty/inactive; no unimplemented items are sold.
-- Raid bosses are only created by an administrator through the existing admin route.
