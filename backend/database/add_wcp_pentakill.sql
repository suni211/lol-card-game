-- WCP (World Championship Pentakill) Cards
-- 월드 챔피언쉽에서 펜타킬을 달성한 선수들

-- 지역 결정: SSG/GRF/HLE/SN/BLG/DK/T1/GAM = LCK/LPL, FNC/OG/FB/SUP/BDS = LEC, C9 = LCS, FW/SGB = PCS, LYON/INF/LOUD = LATAM

INSERT INTO players (
  name, team, position, overall, region, season,
  laning, teamfight, macro, mental,
  cs_ability, lane_pressure, damage_dealing, survivability,
  objective_control, vision_control, decision_making, consistency,
  salary
) VALUES
-- SSG IMP - ADC - 109 (2014 Worlds Pentakill)
('WCP IMP', 'SSG', 'ADC', 109, 'LCK', 'WCP',
  100, 108, 102, 105,
  105, 100, 110, 98, 102, 95, 100, 104, 25),

-- FNC Rekkles - ADC - 108 (2017 Worlds Pentakill)
('WCP Rekkles', 'FNC', 'ADC', 108, 'LEC', 'WCP',
  102, 107, 105, 110,
  108, 98, 105, 108, 100, 96, 105, 110, 24),

-- C9 Balls - TOP - 105 (2015 Worlds Pentakill)
('WCP Balls', 'C9', 'TOP', 105, 'LCS', 'WCP',
  98, 106, 100, 102,
  100, 102, 105, 100, 98, 90, 98, 102, 22),

-- FW NL - ADC - 93 (2015 Worlds Pentakill)
('WCP NL', 'FW', 'ADC', 93, 'LCP', 'WCP',
  88, 95, 85, 90,
  90, 85, 95, 88, 82, 80, 88, 85, 17),

-- OG sOAZ - TOP - 101 (2015 Worlds Pentakill)
('WCP sOAZ', 'OG', 'TOP', 101, 'LEC', 'WCP',
  96, 100, 98, 95,
  95, 98, 98, 95, 95, 88, 96, 92, 20),

-- LYON WhiteLotus - ADC - 92 (2017 Worlds Pentakill)
('WCP WhiteLotus', 'LYON', 'ADC', 92, 'LTA', 'WCP',
  85, 94, 82, 88,
  88, 82, 95, 85, 80, 78, 85, 82, 17),

-- FB Padden - ADC - 90 (2017 Worlds Pentakill)
('WCP Padden', 'FB', 'ADC', 90, 'LEC', 'WCP',
  82, 92, 80, 85,
  85, 80, 92, 82, 78, 75, 82, 80, 16),

-- INF Renyu - ADC - 88 (2018 Worlds Pentakill)
('WCP Renyu', 'INF', 'ADC', 88, 'LTA', 'WCP',
  80, 90, 78, 82,
  82, 78, 90, 80, 76, 72, 80, 78, 15),

-- SUP Zeitnot - ADC - 80 (2019 Worlds Pentakill)
('WCP Zeitnot', 'SUP', 'ADC', 80, 'LEC', 'WCP',
  70, 82, 72, 75,
  75, 68, 82, 72, 68, 65, 72, 70, 12),

-- GRF Viper - ADC - 100 (2019 Worlds Pentakill)
('WCP Viper', 'GRF', 'ADC', 100, 'LCK', 'WCP',
  95, 100, 96, 98,
  98, 92, 102, 95, 92, 88, 95, 96, 20),

-- SN Bin - TOP - 105 (2020 Worlds Pentakill)
('WCP Bin', 'SN', 'TOP', 105, 'LPL', 'WCP',
  100, 105, 95, 100,
  98, 105, 102, 95, 95, 85, 98, 95, 22),

-- DK Khan - TOP - 111 (2021 Worlds Pentakill)
('WCP Khan', 'DK', 'TOP', 111, 'LCK', 'WCP',
  105, 108, 105, 108,
  108, 108, 105, 105, 105, 95, 108, 105, 26),

-- FNC Upset - ADC - 103 (2022 Worlds Pentakill)
('WCP Upset', 'FNC', 'ADC', 103, 'LEC', 'WCP',
  98, 102, 95, 100,
  100, 95, 105, 98, 92, 88, 98, 100, 22),

-- SGB Shogun - ADC - 93 (2022 Worlds Pentakill)
('WCP Shogun', 'SGB', 'ADC', 93, 'LCP', 'WCP',
  85, 95, 85, 90,
  90, 82, 96, 88, 82, 78, 88, 85, 17),

-- LOUD Route - ADC - 93 (2022 Worlds Pentakill)
('WCP Route', 'LOUD', 'ADC', 93, 'LTA', 'WCP',
  86, 94, 86, 88,
  88, 84, 95, 86, 80, 76, 86, 84, 18),

-- GAM Slayder - ADC - 90 (2023 Worlds Pentakill)
('WCP Slayder', 'GAM', 'ADC', 90, 'LCP', 'WCP',
  82, 92, 80, 85,
  85, 80, 92, 82, 78, 75, 82, 80, 17),

-- BDS Crownie - ADC - 102 (2024 Worlds Pentakill)
('WCP Crownie', 'BDS', 'ADC', 102, 'LEC', 'WCP',
  96, 100, 95, 98,
  98, 94, 102, 96, 90, 86, 95, 98, 20);


-- Add WCP Pentakill trait to all WCP cards
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '월드 펜타킬', '월드 챔피언쉽에서 펜타킬 달성', '+8 한타'
FROM players WHERE name LIKE 'WCP %';

-- Individual Traits

-- IMP: SSG World Champion ADC
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '최강 딜러', '압도적인 팀파이트 캐리력', '+12 한타'
FROM players WHERE name = 'WCP IMP';

-- Rekkles: Consistent ADC Master
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '안정의 아이콘', '흔들리지 않는 안정성', '+10 멘탈'
FROM players WHERE name = 'WCP Rekkles';

-- Balls: The Darius Pentakill Legend
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '다리우스 신화', '전설적인 다리우스 펜타킬', '+12 한타'
FROM players WHERE name = 'WCP Balls';

-- NL: Flash Wolves ADC
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '대만의 자존심', 'LMS 최고의 원딜', '+8 딜량'
FROM players WHERE name = 'WCP NL';

-- sOAZ: Veteran Top Laner
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '역대급 베테랑', '오랜 경험의 안정감', '+10 운영'
FROM players WHERE name = 'WCP sOAZ';

-- WhiteLotus: LATAM Legend
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '라틴의 영웅', 'LATAM 리전의 전설', '+8 딜량'
FROM players WHERE name = 'WCP WhiteLotus';

-- Padden: Turkish ADC
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '터키의 희망', 'TCL 최고의 원딜', '+7 한타'
FROM players WHERE name = 'WCP Padden';

-- Renyu: Infinity eSports Star
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '라틴 신예', 'LATAM의 떠오르는 별', '+7 딜량'
FROM players WHERE name = 'WCP Renyu';

-- Zeitnot: SuperMassive ADC
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '와일드카드 원딜', '와일드카드 팀의 에이스', '+6 한타'
FROM players WHERE name = 'WCP Zeitnot';

-- Viper: Perfect Teamfighter
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '완벽한 포지셔닝', '흠잡을 데 없는 팀파이트', '+12 한타'
FROM players WHERE name = 'WCP Viper';

-- Bin: Aggressive Top
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '공격적 탑', '상대를 압도하는 라인전', '+10 라인전'
FROM players WHERE name = 'WCP Bin';

-- Khan: The Top Lane God
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '탑신 칸', '탑 라인의 지배자', '+15 라인전'
FROM players WHERE name = 'WCP Khan';

-- Upset: FNC Star ADC
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, 'FNC의 에이스', 'EU 최고의 원딜', '+10 한타'
FROM players WHERE name = 'WCP Upset';

-- Shogun: VCS Representative
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '베트남의 총', '공격적인 플레이', '+8 딜량'
FROM players WHERE name = 'WCP Shogun';

-- Route: LOUD Superstar
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, 'CBLOL의 희망', '브라질의 에이스', '+8 한타'
FROM players WHERE name = 'WCP Route';

-- Slayder: GAM Star
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, 'VCS의 별', '베트남의 떠오르는 별', '+7 딜량'
FROM players WHERE name = 'WCP Slayder';

-- Crownie: BDS Clutch Player
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '클러치 플레이어', '결정적 순간의 영웅', '+10 한타'
FROM players WHERE name = 'WCP Crownie';
