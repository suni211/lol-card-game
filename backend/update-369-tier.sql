-- Update 369 player tier to EPIC
UPDATE players
SET tier = 'EPIC'
WHERE name LIKE '%369%';

-- Verify the change
SELECT id, name, team, tier, overall
FROM players
WHERE name LIKE '%369%';
