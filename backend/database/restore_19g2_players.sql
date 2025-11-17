-- Restore 19G2 (2019 G2 Esports) Players
-- 2019 MSI Champions & Worlds Finalists

USE lol_card_game;

-- Check if 19G2 players exist
SELECT COUNT(*) as existing_19g2_count FROM players WHERE season = '19G2';

-- Delete existing 19G2 players if any (to avoid duplicates)
DELETE FROM players WHERE season = '19G2';

-- Insert 19G2 Players (2019 G2 Esports - Golden Road Close)
INSERT INTO players (name, team, position, overall, region, season, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('Wunder', 'G2', 'TOP', 105, 'LEC', '19G2', 95, 98, 96, 97, 94, 96, 95, 93, 94, 90, 96, 95),
('Jankos', 'G2', 'JUNGLE', 104, 'LEC', '19G2', 90, 99, 98, 96, 88, 92, 94, 92, 97, 95, 97, 94),
('Caps', 'G2', 'MID', 107, 'LEC', '19G2', 98, 99, 97, 98, 97, 98, 99, 94, 95, 92, 98, 96),
('Perkz', 'G2', 'ADC', 106, 'LEC', '19G2', 96, 98, 97, 99, 96, 95, 98, 95, 94, 91, 97, 97),
('Mikyx', 'G2', 'SUPPORT', 103, 'LEC', '19G2', 92, 97, 96, 95, 85, 91, 88, 94, 95, 98, 96, 93);

-- Verify insertion
SELECT * FROM players WHERE season = '19G2';
