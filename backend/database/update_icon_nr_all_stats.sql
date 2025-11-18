-- Update ICON and NR player ALL stats (12 stats) proportional to overall rating (110-130 range)
USE lol_card_game;

-- [ICON] Deft (overall 121) - 완벽한 포지셔닝의 ADC
UPDATE players SET
  laning = 120,
  teamfight = 126,
  macro = 123,
  mental = 125,
  cs_ability = 127,
  lane_pressure = 118,
  damage_dealing = 128,
  survivability = 124,
  objective_control = 120,
  vision_control = 115,
  decision_making = 125,
  consistency = 129
WHERE id = 1063;

-- [ICON] Mystic (overall 119) - 울트라 하이퍼 캐리 ADC
UPDATE players SET
  laning = 115,
  teamfight = 128,
  macro = 118,
  mental = 121,
  cs_ability = 122,
  lane_pressure = 114,
  damage_dealing = 130,
  survivability = 116,
  objective_control = 117,
  vision_control = 110,
  decision_making = 120,
  consistency = 117
WHERE id = 1062;

-- [ICON] Peanut (overall 118) - 공격적인 정글러
UPDATE players SET
  laning = 114,
  teamfight = 122,
  macro = 121,
  mental = 118,
  cs_ability = 116,
  lane_pressure = 120,
  damage_dealing = 119,
  survivability = 115,
  objective_control = 125,
  vision_control = 124,
  decision_making = 121,
  consistency = 117
WHERE id = 1064;

-- [NR] Deft (overall 116) - 안정적인 후반 캐리
UPDATE players SET
  laning = 115,
  teamfight = 119,
  macro = 117,
  mental = 118,
  cs_ability = 120,
  lane_pressure = 113,
  damage_dealing = 121,
  survivability = 117,
  objective_control = 115,
  vision_control = 110,
  decision_making = 118,
  consistency = 122
WHERE id = 1066;

-- [NR] Mystic (overall 114) - 초반 강력한 ADC
UPDATE players SET
  laning = 112,
  teamfight = 121,
  macro = 113,
  mental = 115,
  cs_ability = 117,
  lane_pressure = 111,
  damage_dealing = 123,
  survivability = 112,
  objective_control = 113,
  vision_control = 108,
  decision_making = 115,
  consistency = 114
WHERE id = 1065;

-- [NR] Peanut (overall 113) - 적극적인 갱커
UPDATE players SET
  laning = 110,
  teamfight = 117,
  macro = 116,
  mental = 113,
  cs_ability = 112,
  lane_pressure = 115,
  damage_dealing = 114,
  survivability = 111,
  objective_control = 120,
  vision_control = 118,
  decision_making = 116,
  consistency = 113
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
