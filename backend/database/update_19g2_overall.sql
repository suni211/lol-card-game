-- Update 19G2 players overall by +3

UPDATE players
SET overall = overall + 3
WHERE season = '19G2' AND name IN ('Wunder', 'Jankos', 'Caps', 'Perkz', 'Mikyx');

-- Verify the update
SELECT name, team, position, overall, tier, season
FROM players
WHERE season = '19G2'
ORDER BY FIELD(position, 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT');
