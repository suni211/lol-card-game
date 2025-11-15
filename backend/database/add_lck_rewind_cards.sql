-- LCK REWIND RE Series Cards
-- Legendary players from LCK history
-- Team synergy: NJS=BRO, AZF=CJ, MVP=Samsung, SKT=T1 (treated as same for synergy calculation)

INSERT INTO players (name, team, position, overall, region, tier, season) VALUES
-- NJS (Najin Sword)
('RE MaKNooN', 'NJS', 'TOP', 86, 'KR', 'EPIC', 'LCK REWIND'),

-- AZF (Azubu Frost)
('RE MadLife', 'AZF', 'SUPPORT', 93, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE CloudTemplar', 'AZF', 'JUNGLE', 91, 'KR', 'LEGENDARY', 'LCK REWIND'),

-- KT
('RE Ryu', 'KT', 'MID', 90, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE inSec', 'KT', 'JUNGLE', 94, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE KaKAO', 'KT', 'JUNGLE', 83, 'KR', 'EPIC', 'LCK REWIND'),

-- MVP (Samsung)
('RE Dade', 'MVP', 'MID', 88, 'KR', 'EPIC', 'LCK REWIND'),
('RE Imp', 'MVP', 'ADC', 100, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE Mata', 'MVP', 'SUPPORT', 95, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE Dandy', 'MVP', 'JUNGLE', 85, 'KR', 'EPIC', 'LCK REWIND'),

-- SKT
('RE Bengi', 'SKT', 'JUNGLE', 97, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE PoohManDu', 'SKT', 'SUPPORT', 90, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE Piglet', 'SKT', 'ADC', 91, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE Faker', 'SKT', 'MID', 94, 'KR', 'LEGENDARY', 'LCK REWIND'),
('RE Impact', 'SKT', 'TOP', 83, 'KR', 'EPIC', 'LCK REWIND');

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
