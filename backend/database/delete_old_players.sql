-- Delete old ICON players except our new ones
USE lol_card_game;

-- Delete HLE Peanut (conflicts with ICON version)
DELETE FROM players WHERE name = 'Peanut' AND team = 'HLE';

-- Delete all old ICON players EXCEPT our new [ICON] Mystic, Deft, Peanut
DELETE FROM players WHERE season = 'ICON' AND name NOT IN ('[ICON] Mystic', '[ICON] Deft', '[ICON] Peanut');
DELETE FROM players WHERE name LIKE 'ICON%' AND name NOT IN ('[ICON] Mystic', '[ICON] Deft', '[ICON] Peanut');

SELECT 'Old ICON players deleted! Only [ICON] Mystic, Deft, Peanut remain.' as Status;
