-- Fix PC, JM, DAE, 23AG season cards detailed stats
-- Add 12 detailed stats based on overall rating

-- PC Season Stats
UPDATE players SET
  laning = FLOOR(overall * 1.3 + RAND() * 10),
  teamfight = FLOOR(overall * 1.05 + RAND() * 10),
  macro = FLOOR(overall * 1.1 + RAND() * 10),
  mental = FLOOR(overall * 0.95 + RAND() * 10),
  cs_ability = FLOOR(overall * 0.95 + RAND() * 10),
  lane_pressure = FLOOR(overall * 1.15 + RAND() * 10),
  damage_dealing = FLOOR(overall * 1.25 + RAND() * 10),
  survivability = FLOOR(overall * 1.0 + RAND() * 10),
  objective_control = FLOOR(overall * 0.85 + RAND() * 10),
  vision_control = FLOOR(overall * 0.75 + RAND() * 10),
  decision_making = FLOOR(overall * 0.95 + RAND() * 10),
  consistency = FLOOR(overall * 1.0 + RAND() * 10)
WHERE season = 'PC';

-- JM Season Stats
UPDATE players SET
  laning = FLOOR(overall * 1.3 + RAND() * 10),
  teamfight = FLOOR(overall * 1.05 + RAND() * 10),
  macro = FLOOR(overall * 1.1 + RAND() * 10),
  mental = FLOOR(overall * 0.95 + RAND() * 10),
  cs_ability = FLOOR(overall * 0.95 + RAND() * 10),
  lane_pressure = FLOOR(overall * 1.15 + RAND() * 10),
  damage_dealing = FLOOR(overall * 1.25 + RAND() * 10),
  survivability = FLOOR(overall * 1.0 + RAND() * 10),
  objective_control = FLOOR(overall * 0.85 + RAND() * 10),
  vision_control = FLOOR(overall * 0.75 + RAND() * 10),
  decision_making = FLOOR(overall * 0.95 + RAND() * 10),
  consistency = FLOOR(overall * 1.0 + RAND() * 10)
WHERE season = 'JM';

-- DAE Season Stats
UPDATE players SET
  laning = FLOOR(overall * 1.3 + RAND() * 10),
  teamfight = FLOOR(overall * 1.05 + RAND() * 10),
  macro = FLOOR(overall * 1.1 + RAND() * 10),
  mental = FLOOR(overall * 0.95 + RAND() * 10),
  cs_ability = FLOOR(overall * 0.95 + RAND() * 10),
  lane_pressure = FLOOR(overall * 1.15 + RAND() * 10),
  damage_dealing = FLOOR(overall * 1.25 + RAND() * 10),
  survivability = FLOOR(overall * 1.0 + RAND() * 10),
  objective_control = FLOOR(overall * 0.85 + RAND() * 10),
  vision_control = FLOOR(overall * 0.75 + RAND() * 10),
  decision_making = FLOOR(overall * 0.95 + RAND() * 10),
  consistency = FLOOR(overall * 1.0 + RAND() * 10)
WHERE season = 'DAE';

-- 23AG Season Stats
UPDATE players SET
  laning = FLOOR(overall * 1.3 + RAND() * 10),
  teamfight = FLOOR(overall * 1.05 + RAND() * 10),
  macro = FLOOR(overall * 1.1 + RAND() * 10),
  mental = FLOOR(overall * 0.95 + RAND() * 10),
  cs_ability = FLOOR(overall * 0.95 + RAND() * 10),
  lane_pressure = FLOOR(overall * 1.15 + RAND() * 10),
  damage_dealing = FLOOR(overall * 1.25 + RAND() * 10),
  survivability = FLOOR(overall * 1.0 + RAND() * 10),
  objective_control = FLOOR(overall * 0.85 + RAND() * 10),
  vision_control = FLOOR(overall * 0.75 + RAND() * 10),
  decision_making = FLOOR(overall * 0.95 + RAND() * 10),
  consistency = FLOOR(overall * 1.0 + RAND() * 10)
WHERE season = '23AG';

-- Verify the updates
SELECT
  name,
  overall,
  season,
  laning, teamfight, macro, mental,
  cs_ability, lane_pressure, damage_dealing, survivability,
  objective_control, vision_control, decision_making, consistency,
  (laning + teamfight + macro + mental + cs_ability + lane_pressure +
   damage_dealing + survivability + objective_control + vision_control +
   decision_making + consistency) as total_stats
FROM players
WHERE season IN ('PC', 'JM', 'DAE', '23AG')
ORDER BY season, overall DESC
LIMIT 20;
