-- Delete only conflicting HLE Peanut
USE lol_card_game;

-- Delete HLE Peanut (conflicts with ICON version)
DELETE FROM players WHERE name = 'Peanut' AND team = 'HLE' AND season IS NULL;

SELECT 'Conflicting HLE Peanut deleted!' as Status;
