-- Delete existing 2016 Worlds players
DELETE FROM players WHERE season = '16WC';
DELETE FROM players WHERE name LIKE '16WC %';

-- 2016 World Championship Players (16WC prefix)

-- H2K Gaming (LEC)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC Odoamne', 'H2K Gaming', 'TOP', 95, 'LEC', '16WC', 13000, 92, 96, 88, 90, 85, 90, 85, 98, 82, 75, 91, 94),
('16WC Jankos', 'H2K Gaming', 'JUNGLE', 91, 'LEC', '16WC', 11000, 80, 92, 93, 88, 75, 78, 82, 85, 95, 90, 94, 89),
('16WC Ryu', 'H2K Gaming', 'MID', 88, 'LEC', '16WC', 9000, 90, 87, 85, 92, 91, 88, 86, 82, 75, 78, 89, 88),
('16WC FORG1VEN', 'H2K Gaming', 'ADC', 90, 'LEC', '16WC', 10500, 88, 89, 82, 85, 95, 87, 97, 84, 76, 72, 86, 92),
('16WC Vander', 'H2K Gaming', 'SUPPORT', 91, 'LEC', '16WC', 11000, 75, 93, 90, 91, 70, 72, 68, 88, 85, 97, 92, 90);

-- ROX Tigers (LCK)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency, trait1, trait1_effect) VALUES
('16WC Smeb', 'ROX Tigers', 'TOP', 100, 'LCK', '16WC', 18000, 102, 101, 95, 96, 92, 100, 95, 103, 88, 82, 98, 99, '16ROX', '팀 시너지: ROX Tigers 팀원과 함께 할 때 모든 능력치 +3'),
('16WC Peanut', 'ROX Tigers', 'JUNGLE', 99, 'LCK', '16WC', 16000, 85, 100, 98, 94, 80, 88, 92, 90, 102, 95, 101, 96, '16ROX', '팀 시너지: ROX Tigers 팀원과 함께 할 때 모든 능력치 +3'),
('16WC Kuro', 'ROX Tigers', 'MID', 101, 'LCK', '16WC', 18000, 98, 103, 96, 99, 100, 95, 99, 92, 87, 90, 98, 102, '16ROX', '팀 시너지: ROX Tigers 팀원과 함께 할 때 모든 능력치 +3'),
('16WC GorillA', 'ROX Tigers', 'SUPPORT', 94, 'LCK', '16WC', 12500, 78, 96, 92, 93, 72, 75, 70, 90, 88, 98, 95, 93, '16ROX', '팀 시너지: ROX Tigers 팀원과 함께 할 때 모든 능력치 +3');

INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency, trait1, trait2, trait1_effect, trait2_effect) VALUES
('16WC PraY', 'ROX Tigers', 'ADC', 102, 'LCK', '16WC', 19000, 95, 105, 93, 97, 103, 96, 108, 98, 85, 80, 100, 101, '16ROX', '신궁', '팀 시너지: ROX Tigers 팀원과 함께 할 때 모든 능력치 +3', '팀원 전원 한타력 +3');

-- SKT T1 (LCK)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC Duke', 'SKT T1', 'TOP', 99, 'LCK', '16WC', 16000, 98, 100, 92, 95, 90, 97, 90, 102, 85, 80, 96, 98),
('16WC Bengi', 'SKT T1', 'JUNGLE', 102, 'LCK', '16WC', 19000, 82, 105, 103, 101, 78, 80, 85, 92, 108, 100, 105, 100),
('16WC Bang', 'SKT T1', 'ADC', 100, 'LCK', '16WC', 18000, 96, 101, 91, 97, 104, 95, 107, 96, 83, 78, 98, 102),
('16WC Wolf', 'SKT T1', 'SUPPORT', 95, 'LCK', '16WC', 13000, 80, 97, 93, 94, 75, 78, 72, 91, 87, 96, 94, 96),
('16WC Blank', 'SKT T1', 'JUNGLE', 93, 'LCK', '16WC', 12000, 78, 94, 90, 89, 74, 76, 80, 86, 96, 88, 92, 91);

INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency, trait1, trait1_effect) VALUES
('16WC Faker', 'SKT T1', 'MID', 103, 'LCK', '16WC', 20000, 105, 107, 100, 103, 106, 103, 110, 98, 90, 88, 106, 105, '고전파', '클래식 챔피언 사용 시 모든 능력치 +5');

-- Samsung Galaxy (LCK)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC CuVee', 'Samsung Galaxy', 'TOP', 100, 'LCK', '16WC', 18000, 99, 102, 93, 96, 91, 99, 92, 105, 86, 81, 97, 100),
('16WC Ambition', 'Samsung Galaxy', 'JUNGLE', 99, 'LCK', '16WC', 16000, 81, 101, 100, 98, 77, 79, 84, 91, 105, 97, 102, 98),
('16WC Crown', 'Samsung Galaxy', 'MID', 95, 'LCK', '16WC', 13000, 96, 94, 88, 92, 98, 94, 96, 90, 82, 80, 93, 95),
('16WC Ruler', 'Samsung Galaxy', 'ADC', 101, 'LCK', '16WC', 18000, 97, 102, 90, 95, 105, 96, 108, 97, 84, 79, 99, 103),
('16WC CoreJJ', 'Samsung Galaxy', 'SUPPORT', 95, 'LCK', '16WC', 13000, 79, 98, 94, 93, 74, 77, 71, 92, 88, 97, 95, 95);

-- Team SoloMid (LCS)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC Hauntzer', 'Team SoloMid', 'TOP', 82, 'LCS', '16WC', 7000, 84, 81, 75, 80, 78, 83, 76, 86, 72, 68, 79, 82),
('16WC Svenskeren', 'Team SoloMid', 'JUNGLE', 80, 'LCS', '16WC', 6500, 70, 81, 78, 76, 68, 71, 73, 77, 84, 79, 80, 78),
('16WC Bjergsen', 'Team SoloMid', 'MID', 77, 'LCS', '16WC', 6000, 80, 76, 72, 81, 82, 79, 78, 74, 68, 65, 77, 79),
('16WC Doublelift', 'Team SoloMid', 'ADC', 78, 'LCS', '16WC', 6000, 76, 77, 70, 75, 83, 77, 85, 72, 66, 63, 75, 80);

-- Counter Logic Gaming (LCS)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC Darshan', 'Counter Logic Gaming', 'TOP', 80, 'LCS', '16WC', 6500, 82, 79, 74, 78, 76, 81, 74, 84, 71, 67, 77, 80),
('16WC Xmithie', 'Counter Logic Gaming', 'JUNGLE', 78, 'LCS', '16WC', 6000, 68, 79, 77, 77, 66, 69, 71, 76, 82, 78, 79, 77),
('16WC Huhi', 'Counter Logic Gaming', 'MID', 77, 'LCS', '16WC', 6000, 79, 75, 71, 80, 80, 78, 76, 72, 67, 64, 76, 78),
('16WC Stixxay', 'Counter Logic Gaming', 'ADC', 75, 'LCS', '16WC', 5500, 73, 74, 68, 73, 80, 75, 82, 70, 64, 61, 73, 77),
('16WC aphromoo', 'Counter Logic Gaming', 'SUPPORT', 72, 'LCS', '16WC', 5000, 63, 74, 71, 75, 60, 64, 58, 70, 68, 76, 73, 74);

-- Cloud9 (LCS)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC Impact', 'Cloud9', 'TOP', 90, 'LCS', '16WC', 10500, 91, 90, 84, 87, 83, 90, 82, 94, 78, 73, 88, 90),
('16WC Meteos', 'Cloud9', 'JUNGLE', 91, 'LCS', '16WC', 11000, 78, 92, 89, 88, 73, 77, 80, 84, 94, 89, 91, 89),
('16WC Jensen', 'Cloud9', 'MID', 90, 'LCS', '16WC', 10500, 92, 89, 83, 86, 94, 91, 91, 83, 76, 72, 88, 90),
('16WC Sneaky', 'Cloud9', 'ADC', 88, 'LCS', '16WC', 9000, 85, 87, 80, 84, 92, 86, 94, 84, 74, 70, 85, 89),
('16WC Smoothie', 'Cloud9', 'SUPPORT', 81, 'LCS', '16WC', 7000, 71, 83, 80, 82, 68, 70, 65, 79, 77, 85, 81, 82);

-- Edward Gaming (LPL)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC Koro1', 'Edward Gaming', 'TOP', 89, 'LPL', '16WC', 9500, 90, 88, 82, 86, 82, 89, 80, 92, 77, 72, 87, 89),
('16WC Clearlove', 'Edward Gaming', 'JUNGLE', 85, 'LPL', '16WC', 8000, 74, 86, 84, 83, 71, 73, 76, 80, 89, 84, 88, 84),
('16WC Scout', 'Edward Gaming', 'MID', 82, 'LPL', '16WC', 7000, 85, 81, 76, 80, 86, 84, 83, 76, 71, 68, 80, 82),
('16WC Deft', 'Edward Gaming', 'ADC', 81, 'LPL', '16WC', 7000, 79, 80, 74, 78, 86, 80, 88, 77, 70, 66, 79, 83),
('16WC Meiko', 'Edward Gaming', 'SUPPORT', 80, 'LPL', '16WC', 6500, 70, 82, 79, 81, 67, 69, 64, 78, 76, 84, 80, 81),
('16WC PawN', 'Edward Gaming', 'MID', 77, 'LPL', '16WC', 6000, 80, 76, 71, 82, 81, 79, 77, 73, 67, 64, 75, 78);

-- Royal Never Give Up (LPL)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC Looper', 'Royal Never Give Up', 'TOP', 90, 'LPL', '16WC', 10500, 91, 89, 84, 87, 83, 90, 81, 93, 78, 73, 88, 90),
('16WC mlxg', 'Royal Never Give Up', 'JUNGLE', 88, 'LPL', '16WC', 9000, 76, 90, 85, 86, 72, 75, 81, 83, 92, 87, 89, 87),
('16WC xiaohu', 'Royal Never Give Up', 'MID', 89, 'LPL', '16WC', 9500, 91, 88, 82, 86, 92, 90, 90, 81, 75, 71, 87, 89),
('16WC Uzi', 'Royal Never Give Up', 'ADC', 88, 'LPL', '16WC', 9000, 86, 87, 79, 83, 93, 87, 96, 82, 73, 69, 85, 90),
('16WC Mata', 'Royal Never Give Up', 'SUPPORT', 91, 'LPL', '16WC', 11000, 76, 93, 91, 92, 71, 73, 69, 89, 86, 96, 93, 91);

-- Albus NoX Luna (LEC - 러시아)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC Smurf', 'Albus NoX Luna', 'TOP', 91, 'LEC', '16WC', 11000, 92, 90, 85, 88, 84, 91, 83, 95, 79, 74, 89, 91),
('16WC PvPStejos', 'Albus NoX Luna', 'JUNGLE', 90, 'LEC', '16WC', 10500, 77, 91, 88, 87, 74, 76, 79, 85, 94, 88, 90, 88),
('16WC Kira', 'Albus NoX Luna', 'MID', 88, 'LEC', '16WC', 9000, 90, 87, 81, 85, 91, 89, 88, 80, 74, 70, 86, 88),
('16WC aMiracle', 'Albus NoX Luna', 'ADC', 81, 'LEC', '16WC', 7000, 79, 80, 74, 78, 85, 80, 87, 77, 70, 66, 79, 82),
('16WC Likkrit', 'Albus NoX Luna', 'SUPPORT', 82, 'LEC', '16WC', 7000, 72, 84, 81, 83, 69, 71, 66, 80, 78, 86, 82, 83);

-- INTZ e-Sports (CBLOL)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC yang', 'INTZ e-Sports', 'TOP', 55, 'CBLOL', '16WC', 2200, 58, 54, 48, 53, 52, 57, 50, 59, 45, 42, 52, 55),
('16WC Revolta', 'INTZ e-Sports', 'JUNGLE', 49, 'CBLOL', '16WC', 1800, 42, 50, 48, 47, 40, 43, 44, 46, 52, 48, 50, 48),
('16WC tockers', 'INTZ e-Sports', 'MID', 53, 'CBLOL', '16WC', 2000, 56, 52, 47, 52, 55, 54, 53, 49, 44, 41, 51, 53),
('16WC micaO', 'INTZ e-Sports', 'ADC', 45, 'CBLOL', '16WC', 1600, 44, 44, 40, 43, 48, 45, 50, 42, 38, 36, 43, 46),
('16WC Jockster', 'INTZ e-Sports', 'SUPPORT', 45, 'CBLOL', '16WC', 1600, 38, 46, 44, 46, 36, 39, 35, 44, 42, 48, 45, 46);

-- G2 Esports (LEC)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC Expect', 'G2 Esports', 'TOP', 66, 'LEC', '16WC', 3500, 68, 65, 60, 64, 62, 67, 60, 70, 56, 52, 63, 66),
('16WC Trick', 'G2 Esports', 'JUNGLE', 65, 'LEC', '16WC', 3300, 56, 66, 64, 63, 54, 55, 58, 62, 68, 64, 66, 64),
('16WC Perkz', 'G2 Esports', 'MID', 66, 'LEC', '16WC', 3500, 69, 65, 60, 64, 70, 68, 67, 61, 55, 52, 64, 66),
('16WC Zven', 'G2 Esports', 'ADC', 65, 'LEC', '16WC', 3300, 63, 64, 59, 62, 69, 64, 71, 61, 54, 51, 62, 66),
('16WC mithy', 'G2 Esports', 'SUPPORT', 63, 'LEC', '16WC', 3000, 53, 65, 62, 64, 51, 53, 49, 62, 59, 66, 63, 64);

-- Splyce (LEC)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC Wunder', 'Splyce', 'TOP', 62, 'LEC', '16WC', 2800, 64, 61, 56, 60, 58, 63, 56, 66, 52, 48, 60, 62),
('16WC Trashy', 'Splyce', 'JUNGLE', 60, 'LEC', '16WC', 2600, 52, 61, 59, 58, 50, 51, 54, 58, 63, 59, 61, 59),
('16WC Sencux', 'Splyce', 'MID', 59, 'LEC', '16WC', 2500, 62, 58, 54, 61, 63, 61, 60, 55, 51, 48, 58, 60),
('16WC Kobbe', 'Splyce', 'ADC', 60, 'LEC', '16WC', 2600, 58, 59, 55, 58, 64, 59, 66, 57, 50, 47, 58, 61),
('16WC Mikyx', 'Splyce', 'SUPPORT', 63, 'LEC', '16WC', 3000, 53, 65, 62, 64, 51, 53, 49, 62, 59, 66, 63, 64);

-- Flash Wolves (LMS)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC MMD', 'Flash Wolves', 'TOP', 61, 'LMS', '16WC', 2700, 63, 60, 55, 59, 57, 62, 55, 65, 51, 47, 59, 61),
('16WC Karsa', 'Flash Wolves', 'JUNGLE', 68, 'LMS', '16WC', 3800, 58, 69, 67, 66, 56, 57, 61, 65, 71, 67, 69, 67),
('16WC Maple', 'Flash Wolves', 'MID', 65, 'LMS', '16WC', 3300, 68, 64, 59, 63, 69, 67, 66, 60, 54, 51, 63, 65),
('16WC NL', 'Flash Wolves', 'ADC', 63, 'LMS', '16WC', 3000, 61, 62, 57, 60, 67, 62, 69, 59, 53, 50, 61, 64),
('16WC SwordArt', 'Flash Wolves', 'SUPPORT', 62, 'LMS', '16WC', 2800, 52, 64, 61, 63, 50, 52, 48, 61, 58, 65, 62, 63);

-- ahq e-Sports Club (LMS)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC Ziv', 'ahq e-Sports Club', 'TOP', 65, 'LMS', '16WC', 3300, 67, 64, 59, 63, 61, 66, 59, 69, 55, 51, 62, 65),
('16WC Mountain', 'ahq e-Sports Club', 'JUNGLE', 63, 'LMS', '16WC', 3000, 54, 64, 62, 61, 52, 53, 57, 60, 66, 62, 64, 62),
('16WC Westdoor', 'ahq e-Sports Club', 'MID', 61, 'LMS', '16WC', 2700, 64, 60, 55, 63, 65, 63, 62, 57, 52, 49, 59, 62),
('16WC AN', 'ahq e-Sports Club', 'ADC', 62, 'LMS', '16WC', 2800, 60, 61, 56, 59, 66, 61, 68, 58, 52, 49, 60, 63),
('16WC Albis', 'ahq e-Sports Club', 'SUPPORT', 63, 'LMS', '16WC', 3000, 53, 65, 62, 64, 51, 53, 49, 62, 59, 66, 63, 64);

-- I May (LPL)
INSERT INTO players (name, team, position, overall, region, season, market_value, laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency) VALUES
('16WC AmazingJ', 'I May', 'TOP', 66, 'LPL', '16WC', 3500, 68, 65, 60, 64, 62, 67, 60, 70, 56, 52, 63, 66),
('16WC Avoidless', 'I May', 'JUNGLE', 66, 'LPL', '16WC', 3500, 57, 67, 65, 64, 55, 56, 59, 63, 69, 65, 67, 65),
('16WC Athena', 'I May', 'MID', 66, 'LPL', '16WC', 3500, 69, 65, 60, 64, 70, 68, 67, 61, 55, 52, 64, 66),
('16WC Jinjiao', 'I May', 'ADC', 64, 'LPL', '16WC', 3200, 62, 63, 58, 61, 68, 63, 70, 60, 54, 51, 62, 65),
('16WC Road', 'I May', 'SUPPORT', 63, 'LPL', '16WC', 3000, 53, 65, 62, 64, 51, 53, 49, 62, 59, 66, 63, 64);
