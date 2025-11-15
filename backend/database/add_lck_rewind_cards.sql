-- LCK REWIND RE Series Cards
-- Legendary players from LCK history

INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- NJS (Najin Sword - treated as BRO)
('RE MaKNooN', 'BRO', 'TOP', 86, 'KR', 'EPIC', 'LCK REWIND'),

-- AZF (Azubu Frost - treated as NS/CJ)
('RE MadLife', 'NS', 'SUPPORT', 93, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE CloudTemplar', 'NS', 'JUNGLE', 91, 'KR', 'LEGENDARY', 'LCK REWIND'),

-- KT
('RE Ryu', 'KT', 'MID', 90, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE inSec', 'KT', 'JUNGLE', 94, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE KaKAO', 'KT', 'JUNGLE', 83, 'KR', 'EPIC', 'LCK REWIND'),

-- MVP (treated as GEN - Samsung)
('RE Dade', 'GEN', 'MID', 88, 'KR', 'EPIC', 'LCK REWIND'),
('RE Imp', 'GEN', 'ADC', 100, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE Mata', 'GEN', 'SUPPORT', 95, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE Dandy', 'GEN', 'JUNGLE', 85, 'KR', 'EPIC', 'LCK REWIND'),

-- SKT (T1)
('RE Bengi', 'T1', 'JUNGLE', 97, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE PoohManDu', 'T1', 'SUPPORT', 90, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE Piglet', 'T1', 'ADC', 91, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE Faker', 'T1', 'MID', 94, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE Impact', 'T1', 'TOP', 83, 'KR', 'EPIC', 'LCK REWIND');

-- Add traits for the legendary RE cards
-- Note: You'll need to get the player IDs after inserting the players above
-- This is an example of how to add traits once you have the IDs:

-- For RE Faker (example)
-- INSERT INTO player_traits (player_id, trait_name, description, bonus_type, bonus_value)
-- SELECT id, 'Unkillable Demon King', 'Legendary playmaking in crucial moments', 'TEAM_BOOST', 3
-- FROM players WHERE name = 'RE Faker';

-- For RE Imp (example)
-- INSERT INTO player_traits (player_id, trait_name, description, bonus_type, bonus_value)
-- SELECT id, 'Perfect ADC', 'World-class positioning and mechanics', 'POSITION_BOOST', 5
-- FROM players WHERE name = 'RE Imp';

-- For RE Mata (example)
-- INSERT INTO player_traits (player_id, trait_name, description, bonus_type, bonus_value)
-- SELECT id, 'Vision Master', 'Revolutionary support playmaking', 'TEAM_BOOST', 4
-- FROM players WHERE name = 'RE Mata';

-- For RE Bengi (example)
-- INSERT INTO player_traits (player_id, trait_name, description, bonus_type, bonus_value)
-- SELECT id, 'The Jungle', 'Perfect synergy with mid lane', 'TEAM_BOOST', 4
-- FROM players WHERE name = 'RE Bengi';

-- For RE MadLife (example)
-- INSERT INTO player_traits (player_id, trait_name, description, bonus_type, bonus_value)
-- SELECT id, 'Madlife Hooks', 'Legendary hook predictions', 'TEAM_BOOST', 4
-- FROM players WHERE name = 'RE MadLife';

-- For RE inSec (example)
-- INSERT INTO player_traits (player_id, trait_name, description, bonus_type, bonus_value)
-- SELECT id, 'InSec Kick', 'Revolutionary Lee Sin mechanics', 'POSITION_BOOST', 5
-- FROM players WHERE name = 'RE inSec';
