-- Delete ALL Mystic, Deft, Peanut players (complete cleanup)
USE lol_card_game;

-- Remove ALL versions of these players
DELETE FROM players WHERE name LIKE '%Mystic%';
DELETE FROM players WHERE name LIKE '%Deft%';
DELETE FROM players WHERE name LIKE '%Peanut%';

SELECT 'All Mystic, Deft, Peanut players deleted!' as Status;
