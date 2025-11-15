-- 2017 SSG Worlds Winner Cards
INSERT INTO players (name, team, position, overall, region, tier, season, laning, teamfight, macro, mental) VALUES
('17SSG CuVee', 'SSG', 'TOP', 102, 'LCK', 'LEGENDARY', '2017', 95, 98, 96, 94),
('17SSG Ambition', 'SSG', 'JUNGLE', 94, 'LCK', 'EPIC', '2017', 85, 92, 96, 95),
('17SSG Crown', 'SSG', 'MID', 100, 'LCK', 'LEGENDARY', '2017', 94, 96, 95, 92),
('17SSG Ruler', 'SSG', 'ADC', 104, 'LCK', 'LEGENDARY', '2017', 98, 99, 97, 96),
('17SSG CoreJJ', 'SSG', 'SUPPORT', 100, 'LCK', 'LEGENDARY', '2017', 90, 98, 97, 95);

-- Add traits for special characteristics
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '월즈 챔피언', '2017 월드 챔피언십 우승', '+5 모든 스탯'
FROM players WHERE name LIKE '17SSG%';

-- CuVee: 라인전 강자
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '라인전 킹', '압도적인 라인전 능력', '+10 라인전'
FROM players WHERE name = '17SSG CuVee';

-- Ambition: 운영의 귀재
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '운영 천재', '완벽한 정글 운영', '+10 운영'
FROM players WHERE name = '17SSG Ambition';

-- Crown: 든든한 중원
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '안정감', '흔들리지 않는 중원', '+8 멘탈'
FROM players WHERE name = '17SSG Crown';

-- Ruler: 캐리력
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '한타의 신', '최고의 한타 캐리', '+12 한타'
FROM players WHERE name = '17SSG Ruler';

-- CoreJJ: 서포터의 정석
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '완벽한 서포터', '월드클래스 서포팅', '+10 한타'
FROM players WHERE name = '17SSG CoreJJ';
