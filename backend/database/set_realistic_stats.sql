-- 모든 선수들에게 Overall과 Tier 기반으로 현실적인 스탯 부여

-- TOP 포지션: 균형잡힌 올라운더
UPDATE players SET
  -- 기존 4개 스탯 (Overall 기반, 최대 200)
  laning = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),
  teamfight = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),
  macro = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),
  mental = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),

  -- 8개 세부 스탯 (최대 200)
  cs_ability = LEAST(200, GREATEST(1, overall - 5 + FLOOR(RAND() * 15))),
  lane_pressure = LEAST(200, GREATEST(1, overall - 5 + FLOOR(RAND() * 15))),
  damage_dealing = LEAST(200, GREATEST(1, overall - 8 + FLOOR(RAND() * 18))),
  survivability = LEAST(200, GREATEST(1, overall - 8 + FLOOR(RAND() * 18))),
  objective_control = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),
  vision_control = LEAST(200, GREATEST(1, overall - 12 + FLOOR(RAND() * 20))),
  decision_making = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),
  consistency = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20)))
WHERE position = 'TOP';

-- JUNGLE 포지션: CS/라인 낮음, 오브젝트/시야 높음
UPDATE players SET
  -- 기존 4개 스탯 (최대 200)
  laning = LEAST(200, GREATEST(1, overall - 20 + FLOOR(RAND() * 15))),
  teamfight = LEAST(200, GREATEST(1, overall - 5 + FLOOR(RAND() * 20))),
  macro = LEAST(200, GREATEST(1, overall + FLOOR(RAND() * 20))),
  mental = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),

  -- 8개 세부 스탯 (최대 200)
  cs_ability = LEAST(200, GREATEST(1, FLOOR(overall * 0.4) + FLOOR(RAND() * 15))),
  lane_pressure = LEAST(200, GREATEST(1, FLOOR(overall * 0.3) + FLOOR(RAND() * 15))),
  damage_dealing = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),
  survivability = LEAST(200, GREATEST(1, overall - 5 + FLOOR(RAND() * 20))),
  objective_control = LEAST(200, GREATEST(1, overall + 5 + FLOOR(RAND() * 15))),
  vision_control = LEAST(200, GREATEST(1, overall + 5 + FLOOR(RAND() * 15))),
  decision_making = LEAST(200, GREATEST(1, overall + FLOOR(RAND() * 20))),
  consistency = LEAST(200, GREATEST(1, overall - 8 + FLOOR(RAND() * 20)))
WHERE position = 'JUNGLE';

-- MID 포지션: 균형잡힌 올라운더
UPDATE players SET
  -- 기존 4개 스탯 (최대 200)
  laning = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),
  teamfight = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),
  macro = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),
  mental = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),

  -- 8개 세부 스탯 (최대 200)
  cs_ability = LEAST(200, GREATEST(1, overall - 5 + FLOOR(RAND() * 15))),
  lane_pressure = LEAST(200, GREATEST(1, overall - 5 + FLOOR(RAND() * 15))),
  damage_dealing = LEAST(200, GREATEST(1, overall - 5 + FLOOR(RAND() * 18))),
  survivability = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 18))),
  objective_control = LEAST(200, GREATEST(1, overall - 8 + FLOOR(RAND() * 20))),
  vision_control = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),
  decision_making = LEAST(200, GREATEST(1, overall - 8 + FLOOR(RAND() * 20))),
  consistency = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20)))
WHERE position = 'MID';

-- ADC 포지션: 딜링 높음, 생존력 조금 낮음
UPDATE players SET
  -- 기존 4개 스탯 (최대 200)
  laning = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),
  teamfight = LEAST(200, GREATEST(1, overall - 5 + FLOOR(RAND() * 20))),
  macro = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),
  mental = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),

  -- 8개 세부 스탯 (최대 200)
  cs_ability = LEAST(200, GREATEST(1, overall - 3 + FLOOR(RAND() * 15))),
  lane_pressure = LEAST(200, GREATEST(1, overall - 8 + FLOOR(RAND() * 15))),
  damage_dealing = LEAST(200, GREATEST(1, overall + 5 + FLOOR(RAND() * 15))),
  survivability = LEAST(200, GREATEST(1, overall - 15 + FLOOR(RAND() * 18))),
  objective_control = LEAST(200, GREATEST(1, overall - 8 + FLOOR(RAND() * 20))),
  vision_control = LEAST(200, GREATEST(1, overall - 12 + FLOOR(RAND() * 20))),
  decision_making = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20))),
  consistency = LEAST(200, GREATEST(1, overall - 10 + FLOOR(RAND() * 20)))
WHERE position = 'ADC';

-- SUPPORT 포지션: CS/딜링 매우 낮음, 시야/판단력/안정성 높음
UPDATE players SET
  -- 기존 4개 스탯 (최대 200)
  laning = LEAST(200, GREATEST(1, overall - 20 + FLOOR(RAND() * 15))),
  teamfight = LEAST(200, GREATEST(1, overall - 5 + FLOOR(RAND() * 20))),
  macro = LEAST(200, GREATEST(1, overall + FLOOR(RAND() * 20))),
  mental = LEAST(200, GREATEST(1, overall + 5 + FLOOR(RAND() * 15))),

  -- 8개 세부 스탯 (최대 200)
  cs_ability = LEAST(200, GREATEST(1, FLOOR(overall * 0.2) + FLOOR(RAND() * 10))),
  lane_pressure = LEAST(200, GREATEST(1, FLOOR(overall * 0.5) + FLOOR(RAND() * 15))),
  damage_dealing = LEAST(200, GREATEST(1, FLOOR(overall * 0.4) + FLOOR(RAND() * 15))),
  survivability = LEAST(200, GREATEST(1, overall - 8 + FLOOR(RAND() * 20))),
  objective_control = LEAST(200, GREATEST(1, overall - 5 + FLOOR(RAND() * 20))),
  vision_control = LEAST(200, GREATEST(1, overall + 10 + FLOOR(RAND() * 15))),
  decision_making = LEAST(200, GREATEST(1, overall + 5 + FLOOR(RAND() * 15))),
  consistency = LEAST(200, GREATEST(1, overall + 5 + FLOOR(RAND() * 15)))
WHERE position = 'SUPPORT';

-- ICON 티어는 모든 스탯 소폭 상승 (최대 200)
UPDATE players SET
  laning = LEAST(200, laning + 3),
  teamfight = LEAST(200, teamfight + 3),
  macro = LEAST(200, macro + 3),
  mental = LEAST(200, mental + 3),
  cs_ability = LEAST(200, cs_ability + 3),
  lane_pressure = LEAST(200, lane_pressure + 3),
  damage_dealing = LEAST(200, damage_dealing + 3),
  survivability = LEAST(200, survivability + 3),
  objective_control = LEAST(200, objective_control + 3),
  vision_control = LEAST(200, vision_control + 3),
  decision_making = LEAST(200, decision_making + 3),
  consistency = LEAST(200, consistency + 3)
WHERE tier = 'ICON';

-- LEGENDARY 티어는 모든 스탯 소폭 상승 (최대 200)
UPDATE players SET
  laning = LEAST(200, laning + 2),
  teamfight = LEAST(200, teamfight + 2),
  macro = LEAST(200, macro + 2),
  mental = LEAST(200, mental + 2),
  cs_ability = LEAST(200, cs_ability + 2),
  lane_pressure = LEAST(200, lane_pressure + 2),
  damage_dealing = LEAST(200, damage_dealing + 2),
  survivability = LEAST(200, survivability + 2),
  objective_control = LEAST(200, objective_control + 2),
  vision_control = LEAST(200, vision_control + 2),
  decision_making = LEAST(200, decision_making + 2),
  consistency = LEAST(200, consistency + 2)
WHERE tier = 'LEGENDARY';
