-- 모든 선수들에게 Overall과 Tier 기반으로 현실적인 스탯 부여

-- TOP 포지션: 균형잡힌 올라운더
UPDATE players SET
  -- 기존 4개 스탯 (Overall 기반, 200 스케일)
  laning = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),
  teamfight = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),
  macro = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),
  mental = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),

  -- 8개 세부 스탯 (200 스케일)
  cs_ability = LEAST(200, GREATEST(1, overall * 2 - 10 + FLOOR(RAND() * 30))),
  lane_pressure = LEAST(200, GREATEST(1, overall * 2 - 10 + FLOOR(RAND() * 30))),
  damage_dealing = LEAST(200, GREATEST(1, overall * 2 - 16 + FLOOR(RAND() * 36))),
  survivability = LEAST(200, GREATEST(1, overall * 2 - 16 + FLOOR(RAND() * 36))),
  objective_control = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),
  vision_control = LEAST(200, GREATEST(1, overall * 2 - 24 + FLOOR(RAND() * 40))),
  decision_making = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),
  consistency = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40)))
WHERE position = 'TOP';

-- JUNGLE 포지션: CS/라인 낮음, 오브젝트/시야 높음
UPDATE players SET
  -- 기존 4개 스탯 (200 스케일)
  laning = LEAST(200, GREATEST(1, overall * 2 - 40 + FLOOR(RAND() * 30))),
  teamfight = LEAST(200, GREATEST(1, overall * 2 - 10 + FLOOR(RAND() * 40))),
  macro = LEAST(200, GREATEST(1, overall * 2 + FLOOR(RAND() * 40))),
  mental = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),

  -- 8개 세부 스탯 (200 스케일)
  cs_ability = LEAST(200, GREATEST(1, FLOOR(overall * 0.8) + FLOOR(RAND() * 30))),
  lane_pressure = LEAST(200, GREATEST(1, FLOOR(overall * 0.6) + FLOOR(RAND() * 30))),
  damage_dealing = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),
  survivability = LEAST(200, GREATEST(1, overall * 2 - 10 + FLOOR(RAND() * 40))),
  objective_control = LEAST(200, GREATEST(1, overall * 2 + 10 + FLOOR(RAND() * 30))),
  vision_control = LEAST(200, GREATEST(1, overall * 2 + 10 + FLOOR(RAND() * 30))),
  decision_making = LEAST(200, GREATEST(1, overall * 2 + FLOOR(RAND() * 40))),
  consistency = LEAST(200, GREATEST(1, overall * 2 - 16 + FLOOR(RAND() * 40)))
WHERE position = 'JUNGLE';

-- MID 포지션: 균형잡힌 올라운더
UPDATE players SET
  -- 기존 4개 스탯 (200 스케일)
  laning = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),
  teamfight = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),
  macro = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),
  mental = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),

  -- 8개 세부 스탯 (200 스케일)
  cs_ability = LEAST(200, GREATEST(1, overall * 2 - 10 + FLOOR(RAND() * 30))),
  lane_pressure = LEAST(200, GREATEST(1, overall * 2 - 10 + FLOOR(RAND() * 30))),
  damage_dealing = LEAST(200, GREATEST(1, overall * 2 - 10 + FLOOR(RAND() * 36))),
  survivability = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 36))),
  objective_control = LEAST(200, GREATEST(1, overall * 2 - 16 + FLOOR(RAND() * 40))),
  vision_control = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),
  decision_making = LEAST(200, GREATEST(1, overall * 2 - 16 + FLOOR(RAND() * 40))),
  consistency = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40)))
WHERE position = 'MID';

-- ADC 포지션: 딜링 높음, 생존력 조금 낮음
UPDATE players SET
  -- 기존 4개 스탯 (200 스케일)
  laning = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),
  teamfight = LEAST(200, GREATEST(1, overall * 2 - 10 + FLOOR(RAND() * 40))),
  macro = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),
  mental = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),

  -- 8개 세부 스탯 (200 스케일)
  cs_ability = LEAST(200, GREATEST(1, overall * 2 - 6 + FLOOR(RAND() * 30))),
  lane_pressure = LEAST(200, GREATEST(1, overall * 2 - 16 + FLOOR(RAND() * 30))),
  damage_dealing = LEAST(200, GREATEST(1, overall * 2 + 10 + FLOOR(RAND() * 30))),
  survivability = LEAST(200, GREATEST(1, overall * 2 - 30 + FLOOR(RAND() * 36))),
  objective_control = LEAST(200, GREATEST(1, overall * 2 - 16 + FLOOR(RAND() * 40))),
  vision_control = LEAST(200, GREATEST(1, overall * 2 - 24 + FLOOR(RAND() * 40))),
  decision_making = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40))),
  consistency = LEAST(200, GREATEST(1, overall * 2 - 20 + FLOOR(RAND() * 40)))
WHERE position = 'ADC';

-- SUPPORT 포지션: CS/딜링 매우 낮음, 시야/판단력/안정성 높음
UPDATE players SET
  -- 기존 4개 스탯 (200 스케일)
  laning = LEAST(200, GREATEST(1, overall * 2 - 40 + FLOOR(RAND() * 30))),
  teamfight = LEAST(200, GREATEST(1, overall * 2 - 10 + FLOOR(RAND() * 40))),
  macro = LEAST(200, GREATEST(1, overall * 2 + FLOOR(RAND() * 40))),
  mental = LEAST(200, GREATEST(1, overall * 2 + 10 + FLOOR(RAND() * 30))),

  -- 8개 세부 스탯 (200 스케일)
  cs_ability = LEAST(200, GREATEST(1, FLOOR(overall * 0.4) + FLOOR(RAND() * 20))),
  lane_pressure = LEAST(200, GREATEST(1, FLOOR(overall * 1.0) + FLOOR(RAND() * 30))),
  damage_dealing = LEAST(200, GREATEST(1, FLOOR(overall * 0.8) + FLOOR(RAND() * 30))),
  survivability = LEAST(200, GREATEST(1, overall * 2 - 16 + FLOOR(RAND() * 40))),
  objective_control = LEAST(200, GREATEST(1, overall * 2 - 10 + FLOOR(RAND() * 40))),
  vision_control = LEAST(200, GREATEST(1, overall * 2 + 20 + FLOOR(RAND() * 30))),
  decision_making = LEAST(200, GREATEST(1, overall * 2 + 10 + FLOOR(RAND() * 30))),
  consistency = LEAST(200, GREATEST(1, overall * 2 + 10 + FLOOR(RAND() * 30)))
WHERE position = 'SUPPORT';

-- ICON 티어는 모든 스탯 소폭 상승 (200 스케일에 맞게 +10)
UPDATE players SET
  laning = LEAST(200, laning + 10),
  teamfight = LEAST(200, teamfight + 10),
  macro = LEAST(200, macro + 10),
  mental = LEAST(200, mental + 10),
  cs_ability = LEAST(200, cs_ability + 10),
  lane_pressure = LEAST(200, lane_pressure + 10),
  damage_dealing = LEAST(200, damage_dealing + 10),
  survivability = LEAST(200, survivability + 10),
  objective_control = LEAST(200, objective_control + 10),
  vision_control = LEAST(200, vision_control + 10),
  decision_making = LEAST(200, decision_making + 10),
  consistency = LEAST(200, consistency + 10)
WHERE tier = 'ICON';

-- LEGENDARY 티어는 모든 스탯 소폭 상승 (200 스케일에 맞게 +6)
UPDATE players SET
  laning = LEAST(200, laning + 6),
  teamfight = LEAST(200, teamfight + 6),
  macro = LEAST(200, macro + 6),
  mental = LEAST(200, mental + 6),
  cs_ability = LEAST(200, cs_ability + 6),
  lane_pressure = LEAST(200, lane_pressure + 6),
  damage_dealing = LEAST(200, damage_dealing + 6),
  survivability = LEAST(200, survivability + 6),
  objective_control = LEAST(200, objective_control + 6),
  vision_control = LEAST(200, vision_control + 6),
  decision_making = LEAST(200, decision_making + 6),
  consistency = LEAST(200, consistency + 6)
WHERE tier = 'LEGENDARY';
