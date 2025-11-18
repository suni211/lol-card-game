-- Update ICON and NR player ALL stats (12 stats) proportional to overall rating (110-130 range)
USE lol_card_game;

-- [ICON] Deft (overall 121) - 완벽한 포지셔닝의 ADC
-- ADC 패턴: damage_dealing, cs_ability, teamfight, consistency 높음
UPDATE players SET
  laning = 120,
  teamfight = 123,
  macro = 112,
  mental = 118,
  cs_ability = 125,
  lane_pressure = 118,
  damage_dealing = 128,
  survivability = 115,
  objective_control = 110,
  vision_control = 105,
  decision_making = 117,
  consistency = 122
WHERE id = 1063;

-- [ICON] Mystic (overall 119) - 울트라 하이퍼 캐리 ADC
-- ADC 패턴: damage_dealing, cs_ability, teamfight, consistency 높음
UPDATE players SET
  laning = 118,
  teamfight = 121,
  macro = 110,
  mental = 115,
  cs_ability = 122,
  lane_pressure = 115,
  damage_dealing = 126,
  survivability = 112,
  objective_control = 108,
  vision_control = 102,
  decision_making = 114,
  consistency = 120
WHERE id = 1062;

-- [ICON] Peanut (overall 118) - 공격적인 정글러
-- JUNGLE 패턴: objective_control, vision_control, macro, decision_making 높음
UPDATE players SET
  laning = 112,
  teamfight = 119,
  macro = 122,
  mental = 115,
  cs_ability = 110,
  lane_pressure = 108,
  damage_dealing = 116,
  survivability = 118,
  objective_control = 125,
  vision_control = 124,
  decision_making = 120,
  consistency = 115
WHERE id = 1064;

-- [NR] Deft (overall 116) - 안정적인 후반 캐리
-- ADC 패턴: damage_dealing, cs_ability, teamfight, consistency 높음
UPDATE players SET
  laning = 115,
  teamfight = 118,
  macro = 107,
  mental = 113,
  cs_ability = 120,
  lane_pressure = 113,
  damage_dealing = 123,
  survivability = 110,
  objective_control = 105,
  vision_control = 100,
  decision_making = 112,
  consistency = 117
WHERE id = 1066;

-- [NR] Mystic (overall 114) - 초반 강력한 ADC
-- ADC 패턴: damage_dealing, cs_ability, teamfight, consistency 높음
UPDATE players SET
  laning = 113,
  teamfight = 116,
  macro = 105,
  mental = 110,
  cs_ability = 117,
  lane_pressure = 110,
  damage_dealing = 121,
  survivability = 107,
  objective_control = 103,
  vision_control = 98,
  decision_making = 109,
  consistency = 115
WHERE id = 1065;

-- [NR] Peanut (overall 113) - 적극적인 갱커
-- JUNGLE 패턴: objective_control, vision_control, macro, decision_making 높음
UPDATE players SET
  laning = 107,
  teamfight = 114,
  macro = 117,
  mental = 110,
  cs_ability = 105,
  lane_pressure = 103,
  damage_dealing = 111,
  survivability = 113,
  objective_control = 120,
  vision_control = 118,
  decision_making = 115,
  consistency = 110
WHERE id = 1067;

-- 결과 확인
SELECT
  id, name, overall,
  laning, teamfight, macro, mental,
  cs_ability, lane_pressure, damage_dealing, survivability,
  objective_control, vision_control, decision_making, consistency
FROM players
WHERE name LIKE '%Mystic%' OR name LIKE '%Deft%' OR name LIKE '%Peanut%'
ORDER BY name, id;

SELECT '모든 능력치 업데이트 완료!' as Status;
