-- 포지션별 특성을 반영하여 세부 스탯 생성
-- 기존 스탯(laning, teamfight, macro, mental)을 기반으로 8개 세부 스탯 계산

-- TOP: 균형잡힌 올라운더
UPDATE players SET
  cs_ability = LEAST(99, GREATEST(1, laning + FLOOR((RAND() - 0.5) * 10))),
  lane_pressure = LEAST(99, GREATEST(1, laning + FLOOR((RAND() - 0.5) * 10))),
  damage_dealing = LEAST(99, GREATEST(1, FLOOR((teamfight * 0.7 + laning * 0.3)) + FLOOR((RAND() - 0.5) * 10))),
  survivability = LEAST(99, GREATEST(1, FLOOR((teamfight * 0.5 + mental * 0.5)) + FLOOR((RAND() - 0.5) * 10))),
  objective_control = LEAST(99, GREATEST(1, FLOOR((macro * 0.8 + teamfight * 0.2)) + FLOOR((RAND() - 0.5) * 10))),
  vision_control = LEAST(99, GREATEST(1, FLOOR((macro * 0.6 + mental * 0.4)) + FLOOR((RAND() - 0.5) * 10))),
  decision_making = LEAST(99, GREATEST(1, FLOOR((macro * 0.6 + mental * 0.4)) + FLOOR((RAND() - 0.5) * 10))),
  consistency = LEAST(99, GREATEST(1, mental + FLOOR((RAND() - 0.5) * 10)))
WHERE position = 'TOP';

-- JUNGLE: CS능력↓, 라인압박↓, 오브젝트↑, 시야↑
UPDATE players SET
  cs_ability = LEAST(99, GREATEST(1, FLOOR(laning * 0.5) + FLOOR((RAND() - 0.5) * 8))),
  lane_pressure = LEAST(99, GREATEST(1, FLOOR(laning * 0.4) + FLOOR((RAND() - 0.5) * 8))),
  damage_dealing = LEAST(99, GREATEST(1, FLOOR((teamfight * 0.7 + macro * 0.3)) + FLOOR((RAND() - 0.5) * 10))),
  survivability = LEAST(99, GREATEST(1, FLOOR((teamfight * 0.4 + mental * 0.6)) + FLOOR((RAND() - 0.5) * 10))),
  objective_control = LEAST(99, GREATEST(1, FLOOR(macro * 1.2) + FLOOR((RAND() - 0.5) * 10))),
  vision_control = LEAST(99, GREATEST(1, FLOOR((macro * 0.8 + mental * 0.4)) + FLOOR((RAND() - 0.5) * 10))),
  decision_making = LEAST(99, GREATEST(1, FLOOR((macro * 0.7 + mental * 0.5)) + FLOOR((RAND() - 0.5) * 10))),
  consistency = LEAST(99, GREATEST(1, mental + FLOOR((RAND() - 0.5) * 10)))
WHERE position = 'JUNGLE';

-- MID: 균형잡힌 올라운더
UPDATE players SET
  cs_ability = LEAST(99, GREATEST(1, laning + FLOOR((RAND() - 0.5) * 10))),
  lane_pressure = LEAST(99, GREATEST(1, laning + FLOOR((RAND() - 0.5) * 10))),
  damage_dealing = LEAST(99, GREATEST(1, FLOOR((teamfight * 0.7 + laning * 0.3)) + FLOOR((RAND() - 0.5) * 10))),
  survivability = LEAST(99, GREATEST(1, FLOOR((teamfight * 0.5 + mental * 0.5)) + FLOOR((RAND() - 0.5) * 10))),
  objective_control = LEAST(99, GREATEST(1, FLOOR((macro * 0.8 + teamfight * 0.2)) + FLOOR((RAND() - 0.5) * 10))),
  vision_control = LEAST(99, GREATEST(1, FLOOR((macro * 0.6 + mental * 0.4)) + FLOOR((RAND() - 0.5) * 10))),
  decision_making = LEAST(99, GREATEST(1, FLOOR((macro * 0.6 + mental * 0.4)) + FLOOR((RAND() - 0.5) * 10))),
  consistency = LEAST(99, GREATEST(1, mental + FLOOR((RAND() - 0.5) * 10)))
WHERE position = 'MID';

-- ADC: 균형잡힌 올라운더
UPDATE players SET
  cs_ability = LEAST(99, GREATEST(1, laning + FLOOR((RAND() - 0.5) * 10))),
  lane_pressure = LEAST(99, GREATEST(1, laning + FLOOR((RAND() - 0.5) * 10))),
  damage_dealing = LEAST(99, GREATEST(1, FLOOR((teamfight * 0.8 + laning * 0.2)) + FLOOR((RAND() - 0.5) * 10))),
  survivability = LEAST(99, GREATEST(1, FLOOR((teamfight * 0.4 + mental * 0.6)) + FLOOR((RAND() - 0.5) * 10))),
  objective_control = LEAST(99, GREATEST(1, FLOOR((macro * 0.7 + teamfight * 0.3)) + FLOOR((RAND() - 0.5) * 10))),
  vision_control = LEAST(99, GREATEST(1, FLOOR((macro * 0.5 + mental * 0.5)) + FLOOR((RAND() - 0.5) * 10))),
  decision_making = LEAST(99, GREATEST(1, FLOOR((macro * 0.5 + mental * 0.5)) + FLOOR((RAND() - 0.5) * 10))),
  consistency = LEAST(99, GREATEST(1, mental + FLOOR((RAND() - 0.5) * 10)))
WHERE position = 'ADC';

-- SUPPORT: CS능력↓, 라인압박↓, 딜링↓, 시야↑, 판단력↑, 안정성↑
UPDATE players SET
  cs_ability = LEAST(99, GREATEST(1, FLOOR(laning * 0.3) + FLOOR((RAND() - 0.5) * 5))),
  lane_pressure = LEAST(99, GREATEST(1, FLOOR(laning * 0.6) + FLOOR((RAND() - 0.5) * 8))),
  damage_dealing = LEAST(99, GREATEST(1, FLOOR(teamfight * 0.4) + FLOOR((RAND() - 0.5) * 8))),
  survivability = LEAST(99, GREATEST(1, FLOOR((teamfight * 0.5 + mental * 0.5)) + FLOOR((RAND() - 0.5) * 10))),
  objective_control = LEAST(99, GREATEST(1, FLOOR((macro * 0.7 + teamfight * 0.3)) + FLOOR((RAND() - 0.5) * 10))),
  vision_control = LEAST(99, GREATEST(1, FLOOR(macro * 1.3) + FLOOR((RAND() - 0.5) * 10))),
  decision_making = LEAST(99, GREATEST(1, FLOOR((macro * 0.7 + mental * 0.6)) + FLOOR((RAND() - 0.5) * 10))),
  consistency = LEAST(99, GREATEST(1, FLOOR(mental * 1.1) + FLOOR((RAND() - 0.5) * 10)))
WHERE position = 'SUPPORT';
