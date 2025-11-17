-- Remove duplicate players from database
-- Keep only one record for each unique combination of (name, team, position, overall, region, season)

USE lol_card_game;

-- Delete duplicates, keeping the one with the lowest id
DELETE p1 FROM players p1
INNER JOIN players p2
WHERE
  p1.id > p2.id
  AND p1.name = p2.name
  AND p1.team = p2.team
  AND p1.position = p2.position
  AND p1.overall = p2.overall
  AND p1.region = p2.region
  AND COALESCE(p1.season, '') = COALESCE(p2.season, '');

-- Verify: Show count of remaining duplicates (should be 0)
SELECT name, team, position, overall, region, season, COUNT(*) as duplicate_count
FROM players
GROUP BY name, team, position, overall, region, season
HAVING COUNT(*) > 1;
