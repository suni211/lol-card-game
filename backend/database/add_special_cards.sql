-- Add special player cards for 2025 Worlds

-- Modify overall column to allow values above 100
ALTER TABLE players MODIFY COLUMN overall INT NOT NULL;

-- 2025 Worlds Winner (25WW) Cards
INSERT INTO players (name, team, position, overall, region, tier, image_url) VALUES
('25WW Doran', 'T1', 'TOP', 90, 'LCK', 'LEGENDARY', NULL),
('25WW Oner', 'T1', 'JUNGLE', 92, 'LCK', 'LEGENDARY', NULL),
('25WW Faker', 'T1', 'MID', 100, 'LCK', 'LEGENDARY', NULL),
('25WW Gumayusi', 'T1', 'ADC', 101, 'LCK', 'LEGENDARY', NULL),
('25WW Keria', 'T1', 'SUPPORT', 99, 'LCK', 'LEGENDARY', NULL);

-- 2025 Worlds Underdog (25WUD) Cards
INSERT INTO players (name, team, position, overall, region, tier, image_url) VALUES
('25WUD PerfecT', 'FlyQuest', 'TOP', 86, 'LCP', 'EPIC', NULL),
('25WUD Cuzz', 'FlyQuest', 'JUNGLE', 87, 'LCP', 'EPIC', NULL),
('25WUD HongQ', 'FlyQuest', 'MID', 82, 'LCP', 'EPIC', NULL),
('25WUD Doggo', 'FlyQuest', 'ADC', 90, 'LCP', 'EPIC', NULL),
('25WUD Peter', 'FlyQuest', 'SUPPORT', 89, 'LCP', 'EPIC', NULL);

-- Add special traits for 25WW cards
-- (We'll add these after getting player IDs)
SET @doran_id = (SELECT id FROM players WHERE name = '25WW Doran');
SET @oner_id = (SELECT id FROM players WHERE name = '25WW Oner');
SET @faker_id = (SELECT id FROM players WHERE name = '25WW Faker');
SET @gumayusi_id = (SELECT id FROM players WHERE name = '25WW Gumayusi');
SET @keria_id = (SELECT id FROM players WHERE name = '25WW Keria');

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@doran_id, 'Worlds Champion', '2025 Worlds Winner', '+10% All Stats'),
(@oner_id, 'Worlds Champion', '2025 Worlds Winner', '+10% All Stats'),
(@faker_id, 'GOAT', 'The Greatest Of All Time', '+15% All Stats'),
(@gumayusi_id, 'Worlds Champion', '2025 Worlds Winner', '+10% All Stats'),
(@keria_id, 'Worlds Champion', '2025 Worlds Winner', '+10% All Stats');

-- Add special traits for 25WUD cards
SET @perfect_id = (SELECT id FROM players WHERE name = '25WUD PerfecT');
SET @cuzz_id = (SELECT id FROM players WHERE name = '25WUD Cuzz');
SET @hongq_id = (SELECT id FROM players WHERE name = '25WUD HongQ');
SET @doggo_id = (SELECT id FROM players WHERE name = '25WUD Doggo');
SET @peter_id = (SELECT id FROM players WHERE name = '25WUD Peter');

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@perfect_id, 'Underdog Spirit', 'Worlds Underdog Story', '+8% All Stats'),
(@cuzz_id, 'Underdog Spirit', 'Worlds Underdog Story', '+8% All Stats'),
(@hongq_id, 'Underdog Spirit', 'Worlds Underdog Story', '+8% All Stats'),
(@doggo_id, 'Underdog Spirit', 'Worlds Underdog Story', '+8% All Stats'),
(@peter_id, 'Underdog Spirit', 'Worlds Underdog Story', '+8% All Stats');
