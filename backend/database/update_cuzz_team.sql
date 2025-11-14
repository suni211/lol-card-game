-- Update Cuzz and PerfecT to KT team

UPDATE players
SET team = 'KT', region = 'LCK'
WHERE name IN ('25WUD Cuzz', '25WUD PerfecT');

-- Verify the changes
SELECT id, name, team, position, overall, region, tier
FROM players
WHERE name IN ('Cuzz', '25WUD Cuzz', 'PerfecT', '25WUD PerfecT')
ORDER BY name;
