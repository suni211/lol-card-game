-- Delete old player versions (Mystic, Deft, Peanut)
USE lol_card_game;

-- Remove ALL old Mystic, Deft, Peanut versions
-- This includes players with or without season column
DELETE FROM players WHERE name = 'Mystic' AND (season IS NULL OR season NOT IN ('ICON', 'NR'));
DELETE FROM players WHERE name = 'Deft' AND (season IS NULL OR season NOT IN ('ICON', 'NR'));
DELETE FROM players WHERE name = 'Peanut' AND (season IS NULL OR season NOT IN ('ICON', 'NR'));

-- Also delete by team if still exists
DELETE FROM players WHERE name = 'Peanut' AND team = 'HLE' AND season != 'ICON';
DELETE FROM players WHERE name = 'Deft' AND team = 'KT' AND season != 'NR';

SELECT 'Old player versions deleted successfully!' as Status;
