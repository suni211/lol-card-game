-- Populate player stats based on their overall and position
-- Formula: Base stats derived from overall, with position-specific adjustments

UPDATE players SET
  laning = CASE
    WHEN position = 'TOP' THEN LEAST(100, overall * 0.95 + FLOOR(RAND() * 10))
    WHEN position = 'MID' THEN LEAST(100, overall * 0.90 + FLOOR(RAND() * 15))
    WHEN position = 'ADC' THEN LEAST(100, overall * 0.85 + FLOOR(RAND() * 15))
    WHEN position = 'SUPPORT' THEN LEAST(100, overall * 0.75 + FLOOR(RAND() * 10))
    ELSE LEAST(100, overall * 0.80 + FLOOR(RAND() * 15))
  END,
  teamfight = CASE
    WHEN position = 'JUNGLE' THEN LEAST(100, overall * 0.95 + FLOOR(RAND() * 10))
    WHEN position = 'SUPPORT' THEN LEAST(100, overall * 0.90 + FLOOR(RAND() * 10))
    WHEN position = 'ADC' THEN LEAST(100, overall * 0.90 + FLOOR(RAND() * 10))
    WHEN position = 'MID' THEN LEAST(100, overall * 0.85 + FLOOR(RAND() * 15))
    ELSE LEAST(100, overall * 0.85 + FLOOR(RAND() * 15))
  END,
  macro = CASE
    WHEN position = 'JUNGLE' THEN LEAST(100, overall * 0.95 + FLOOR(RAND() * 10))
    WHEN position = 'SUPPORT' THEN LEAST(100, overall * 0.90 + FLOOR(RAND() * 10))
    WHEN position = 'MID' THEN LEAST(100, overall * 0.85 + FLOOR(RAND() * 15))
    WHEN position = 'TOP' THEN LEAST(100, overall * 0.80 + FLOOR(RAND() * 15))
    ELSE LEAST(100, overall * 0.80 + FLOOR(RAND() * 15))
  END,
  mental = CASE
    WHEN tier = 'LEGENDARY' THEN LEAST(100, overall * 0.90 + FLOOR(RAND() * 15))
    WHEN tier = 'EPIC' THEN LEAST(100, overall * 0.85 + FLOOR(RAND() * 20))
    WHEN tier = 'RARE' THEN LEAST(100, overall * 0.80 + FLOOR(RAND() * 25))
    ELSE LEAST(100, overall * 0.75 + FLOOR(RAND() * 30))
  END;

-- Ensure no stat goes below 30 or above 100
UPDATE players SET
  laning = GREATEST(30, LEAST(100, laning)),
  teamfight = GREATEST(30, LEAST(100, teamfight)),
  macro = GREATEST(30, LEAST(100, macro)),
  mental = GREATEST(30, LEAST(100, mental));
