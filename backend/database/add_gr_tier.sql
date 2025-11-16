-- GR 티어 추가 (Greatest Rookies - 전성기 유망주들)
-- ICON 티어 오버롤 +5 상향

-- 1. ICON 티어 오버롤 +5 상향
UPDATE players
SET overall = overall + 5
WHERE tier = 'ICON';

-- 2. GR 티어 선수 추가
INSERT INTO players (name, team, position, overall, tier, region, season, image_url) VALUES
('Deft', 'EDG', 'ADC', 105, 'GR', 'LPL', '2014', '/players/deft_2014_gr.png'),
('Faker', 'SKT', 'MID', 103, 'GR', 'LCK', '2013', '/players/faker_2013_gr.png'),
('Siwoo', 'DK', 'TOP', 101, 'GR', 'LCK', '2019', '/players/siwoo_2019_gr.png'),
('Peanut', 'ROX', 'JUNGLE', 102, 'GR', 'LCK', '2016', '/players/peanut_2016_gr.png'),
('Keria', 'T1', 'SUPPORT', 104, 'GR', 'LCK', '2021', '/players/keria_2021_gr.png');

-- 3. 선수별 스탯 설정 (포지션 특성 반영)

-- Deft (ADC) - CS 능력과 딜량이 뛰어남
UPDATE players SET
  laning = 98,
  teamfight = 103,
  macro = 100,
  mental = 102,
  cs_ability = 105,
  lane_pressure = 95,
  damage_dealing = 108,
  survivability = 92,
  objective_control = 98,
  vision_control = 90,
  decision_making = 100,
  consistency = 103
WHERE name = 'Deft' AND tier = 'GR';

-- Faker (MID) - 올라운더, 모든 스탯 균형잡힘
UPDATE players SET
  laning = 102,
  teamfight = 105,
  macro = 103,
  mental = 108,
  cs_ability = 100,
  lane_pressure = 102,
  damage_dealing = 104,
  survivability = 99,
  objective_control = 101,
  vision_control = 98,
  decision_making = 106,
  consistency = 105
WHERE name = 'Faker' AND tier = 'GR';

-- Siwoo (TOP) - 균형잡힌 올라운더 탑라이너
UPDATE players SET
  laning = 100,
  teamfight = 102,
  macro = 99,
  mental = 98,
  cs_ability = 100,
  lane_pressure = 101,
  damage_dealing = 100,
  survivability = 103,
  objective_control = 99,
  vision_control = 95,
  decision_making = 100,
  consistency = 101
WHERE name = 'Siwoo' AND tier = 'GR';

-- Peanut (JUNGLE) - 오브젝트와 시야 장악 특화
UPDATE players SET
  laning = 85,
  teamfight = 100,
  macro = 105,
  mental = 98,
  cs_ability = 45,
  lane_pressure = 35,
  damage_dealing = 95,
  survivability = 103,
  objective_control = 108,
  vision_control = 106,
  decision_making = 104,
  consistency = 98
WHERE name = 'Peanut' AND tier = 'GR';

-- Keria (SUPPORT) - 시야, 판단력, 안정성 특화
UPDATE players SET
  laning = 90,
  teamfight = 102,
  macro = 106,
  mental = 105,
  cs_ability = 25,
  lane_pressure = 55,
  damage_dealing = 48,
  survivability = 100,
  objective_control = 99,
  vision_control = 110,
  decision_making = 108,
  consistency = 107
WHERE name = 'Keria' AND tier = 'GR';

-- 4. 특성 추가
INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '중꺾마', '상대가 능력치가 더 높을 시 종합적으로 더 강해집니다', 'COMEBACK'
FROM players WHERE name = 'Deft' AND tier = 'GR';

INSERT INTO player_traits (player_id, name, description, effect)
SELECT id, '고전파', '역스윕을 할 가능성이 높아집니다', 'REVERSE_SWEEP'
FROM players WHERE name = 'Faker' AND tier = 'GR';

-- 5. GR 티어를 위한 시장 가격 설정 (ICON보다 높게)
INSERT INTO player_market_prices (player_id, current_price, price_floor, price_ceiling, base_price)
SELECT
  id,
  overall * 200 AS current_price,
  overall * 150 AS price_floor,
  overall * 300 AS price_ceiling,
  overall * 200 AS base_price
FROM players
WHERE tier = 'GR';
