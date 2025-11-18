-- Delete old player versions (Mystic, Deft, Peanut without season)
USE lol_card_game;

-- Remove old Mystic, Deft, Peanut (non-ICON/NR versions)
DELETE FROM players WHERE name = 'Mystic' AND season IS NULL;
DELETE FROM players WHERE name = 'Deft' AND season IS NULL;
DELETE FROM players WHERE name = 'Peanut' AND season IS NULL;

SELECT 'Old player versions deleted successfully!' as Status;
