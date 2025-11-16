-- Fix missing tables and columns

-- 1. Add isAdmin column to users table if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS isAdmin BOOLEAN NOT NULL DEFAULT FALSE AFTER email;

-- Set admin for user id 95
UPDATE users SET isAdmin = TRUE WHERE id = 95;

-- 2. Add trait effect columns if not exist
ALTER TABLE players ADD COLUMN IF NOT EXISTS trait1_effect TEXT DEFAULT NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS trait2_effect TEXT DEFAULT NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS trait3_effect TEXT DEFAULT NULL;

-- 3. Create gacha_packs table if not exists
CREATE TABLE IF NOT EXISTS gacha_packs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    pack_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create user_gacha_pity table if not exists
CREATE TABLE IF NOT EXISTS user_gacha_pity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    pack_type VARCHAR(50) NOT NULL,
    pull_count INT DEFAULT 0,
    last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_pack (user_id, pack_type)
);

-- 5. Add 19G2 players if they don't exist
INSERT IGNORE INTO players (name, team, position, overall, region, tier, season,
    trait1, trait1_effect, trait2, trait2_effect,
    laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing,
    survivability, objective_control, vision_control, decision_making, consistency)
VALUES
-- Wunder
('Wunder', 'G2', 'TOP', 102, 'LEC', 'EPIC', '19G2',
    '무지성 돌격', '{"type":"conditional","condition":"leading_2_0","buff":3,"debuff":-5}',
    NULL, NULL,
    82, 80, 78, 85, 80, 82, 85, 75, 76, 70, 80, 78),

-- Jankos
('Jankos', 'G2', 'JUNGLE', 105, 'LEC', 'EPIC', '19G2',
    '획기적인 운영', '{"type":"strategy","strategy":"SPLIT","buff":1,"macro_bonus":5}',
    NULL, NULL,
    75, 82, 88, 90, 70, 75, 78, 80, 92, 85, 90, 88),

-- Caps
('Caps', 'G2', 'MID', 109, 'LEC', 'LEGENDARY', '19G2',
    '획기적인 운영', '{"type":"strategy","strategy":"SPLIT","buff":1,"macro_bonus":5}',
    NULL, NULL,
    90, 95, 88, 92, 92, 95, 98, 85, 85, 80, 92, 90),

-- Perkz (ADC)
('Perkz', 'G2', 'ADC', 105, 'LEC', 'EPIC', '19G2',
    '무지성 돌격', '{"type":"conditional","condition":"leading_2_0","buff":3,"debuff":-5}',
    NULL, NULL,
    85, 88, 82, 95, 85, 82, 92, 80, 78, 75, 88, 85),

-- Mikyx
('Mikyx', 'G2', 'SUPPORT', 108, 'LEC', 'LEGENDARY', '19G2',
    '획기적인 운영', '{"type":"strategy","strategy":"SPLIT","buff":1,"macro_bonus":5}',
    '새가슴', '{"type":"conditional","condition":"tied_2_2","debuff":-3}',
    70, 85, 90, 85, 65, 70, 68, 78, 88, 95, 88, 80);

-- 6. Add 19G2 gacha packs if they don't exist
INSERT IGNORE INTO gacha_packs (name, description, price, pack_type)
VALUES
('19G2 프리미엄 팩', 'G2 2019 골든로드 프리미엄 팩 - 에픽 이상 확정, 50회 천장 시스템', 15000, '19G2_PREMIUM'),
('19G2 라이트 팩', 'G2 2019 골든로드 라이트 팩 - 일반 등급 포함', 500, '19G2_LIGHT');

-- 7. Verify
SELECT 'Users with admin' as info;
SELECT id, username, email, isAdmin FROM users WHERE isAdmin = TRUE;

SELECT '19G2 Players' as info;
SELECT name, team, position, overall, tier, season, trait1, trait2
FROM players
WHERE season = '19G2'
ORDER BY FIELD(position, 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT');

SELECT '19G2 Gacha Packs' as info;
SELECT * FROM gacha_packs WHERE pack_type LIKE '19G2%';
