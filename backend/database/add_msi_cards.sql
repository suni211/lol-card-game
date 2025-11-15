-- MSI Cards (Mid-Season Invitational Legends)
INSERT INTO players (name, team, position, overall, region, tier, season, laning, teamfight, macro, mental) VALUES
-- EDG
('MSI Deft', 'EDG', 'ADC', 104, 'LPL', 'LEGENDARY', 'MSI', 99, 102, 96, 98),
('MSI Clearlove', 'EDG', 'JUNGLE', 99, 'LPL', 'LEGENDARY', 'MSI', 88, 95, 98, 96),

-- SKT (T1)
('MSI Faker', 'SKT', 'MID', 105, 'LCK', 'LEGENDARY', 'MSI', 100, 103, 102, 100),
('MSI Duke', 'SKT', 'TOP', 90, 'LCK', 'EPIC', 'MSI', 88, 92, 87, 89),
('MSI Wolf', 'SKT', 'SUPPORT', 100, 'LCK', 'LEGENDARY', 'MSI', 88, 98, 96, 95),

-- RNG
('MSI Uzi', 'RNG', 'ADC', 101, 'LPL', 'LEGENDARY', 'MSI', 98, 100, 95, 97),
('MSI GALA', 'RNG', 'ADC', 99, 'LPL', 'LEGENDARY', 'MSI', 96, 98, 94, 96),
('MSI Xiaohu', 'RNG', 'TOP', 100, 'LPL', 'LEGENDARY', 'MSI', 95, 98, 97, 96),
('MSI Wei', 'RNG', 'JUNGLE', 94, 'LPL', 'EPIC', 'MSI', 89, 93, 92, 91),

-- G2
('MSI Caps', 'G2', 'MID', 102, 'LEC', 'LEGENDARY', 'MSI', 98, 100, 96, 99),
('MSI Jankos', 'G2', 'JUNGLE', 93, 'LEC', 'EPIC', 'MSI', 87, 92, 91, 90),
('MSI Perkz', 'G2', 'ADC', 95, 'LEC', 'EPIC', 'MSI', 92, 94, 91, 93),

-- JDG
('MSI Knight', 'JDG', 'MID', 102, 'LPL', 'LEGENDARY', 'MSI', 99, 100, 97, 98),
('MSI Ruler', 'JDG', 'ADC', 102, 'LPL', 'LEGENDARY', 'MSI', 98, 101, 96, 97),

-- GEN
('MSI Lehends', 'GEN', 'SUPPORT', 101, 'LCK', 'LEGENDARY', 'MSI', 91, 99, 98, 97),
('MSI Peyz', 'GEN', 'ADC', 102, 'LCK', 'LEGENDARY', 'MSI', 98, 100, 96, 98),
('MSI Chovy', 'GEN', 'MID', 103, 'LCK', 'LEGENDARY', 'MSI', 100, 101, 98, 99);

-- Add MSI Champion trait to all MSI cards
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, 'MSI 챔피언', 'Mid-Season Invitational 우승', '+5 모든 스탯'
FROM players WHERE name LIKE 'MSI %';

-- Deft: Consistent Excellence
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '완벽주의자', '꾸준한 고성능', '+10 한타'
FROM players WHERE name = 'MSI Deft';

-- Clearlove: Jungle Mastermind
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '정글 장인', '완벽한 정글 컨트롤', '+12 운영'
FROM players WHERE name = 'MSI Clearlove';

-- Faker: GOAT
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '불패의 신', '역사상 최고의 미드', '+15 모든 스탯'
FROM players WHERE name = 'MSI Faker';

-- Duke: Tank Specialist
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '탱커 장인', '안정적인 탱킹', '+8 라인전'
FROM players WHERE name = 'MSI Duke';

-- Wolf: Support Genius
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '서포팅 장인', '완벽한 서포팅', '+10 한타'
FROM players WHERE name = 'MSI Wolf';

-- Uzi: ADC God
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, 'ADC의 신', '최고의 원딜', '+12 한타'
FROM players WHERE name = 'MSI Uzi';

-- GALA: Teamfight Master
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '한타 마스터', '결정적 한타', '+10 한타'
FROM players WHERE name = 'MSI GALA';

-- Xiaohu: Versatile
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '만능 플레이어', '모든 라인 가능', '+8 모든 스탯'
FROM players WHERE name = 'MSI Xiaohu';

-- Wei: Aggressive Jungler
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '공격적 정글', '적극적인 갱킹', '+8 라인전'
FROM players WHERE name = 'MSI Wei';

-- Caps: Clutch Player
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '클러치 신', '압도적인 캐리력', '+10 한타'
FROM players WHERE name = 'MSI Caps';

-- Jankos: First Blood King
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '퍼블 킹', '초반 주도권 확보', '+8 라인전'
FROM players WHERE name = 'MSI Jankos';

-- Perkz: Roleswap Master
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '적응력', '빠른 적응', '+7 모든 스탯'
FROM players WHERE name = 'MSI Perkz';

-- Knight: Laning God
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '라인전 킹', '압도적인 라인전', '+12 라인전'
FROM players WHERE name = 'MSI Knight';

-- Ruler: World Champion ADC
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '챔피언 원딜', '우승 경험 ADC', '+10 한타'
FROM players WHERE name = 'MSI Ruler';

-- Lehends: Vision Master
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '시야 장인', '완벽한 시야 장악', '+10 운영'
FROM players WHERE name = 'MSI Lehends';

-- Peyz: Rising Star
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '라이징 스타', '떠오르는 신예', '+8 한타'
FROM players WHERE name = 'MSI Peyz';

-- Chovy: Lane Dominator
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '라인 지배자', '라인전 압살', '+12 라인전'
FROM players WHERE name = 'MSI Chovy';
