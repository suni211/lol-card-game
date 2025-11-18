-- Add ICON and No Rival series players
USE lol_card_game;

-- ============================================
-- DELETE OLD VERSIONS
-- ============================================

-- Remove old Mystic, Deft, Peanut (non-ICON/NR versions)
DELETE FROM players WHERE name = 'Mystic' AND season IS NULL;
DELETE FROM players WHERE name = 'Deft' AND season IS NULL;
DELETE FROM players WHERE name = 'Peanut' AND season IS NULL;

-- ============================================
-- ICON SERIES - LEGENDARY RETIRED PLAYERS
-- ============================================

-- ICON Mystic (WE, DNF)
INSERT INTO players (name, team, position, overall, region, season, market_value) VALUES
('[ICON] Mystic', 'WE', 'ADC', 119, 'LPL', 'ICON', 150000);

SET @mystic_id = LAST_INSERT_ID();

-- Mystic teams
INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@mystic_id, 'WE', TRUE),
(@mystic_id, 'DNF', FALSE);

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@mystic_id, '울트라 하이퍼 캐리', '팀이 지고있을때 엄청난 기량을 보입니다.', '+5 ALL_STATS_WHEN_LOSING'),
(@mystic_id, '팀이 이상해', '파워 레벨이 팀이 550 미만일 경우 능력치 상승', '+10 ALL_STATS_IF_TEAM_POWER_BELOW_550');

-- Mystic stats (ICON)
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(@mystic_id, 88, 92, 95, 75, 85, 90);

-- ICON Deft (DRX, KT, EDG)
INSERT INTO players (name, team, position, overall, region, season, market_value) VALUES
('[ICON] Deft', 'DRX', 'ADC', 121, 'LCK', 'ICON', 180000);

SET @deft_id = LAST_INSERT_ID();

-- Deft teams
INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@deft_id, 'DRX', TRUE),
(@deft_id, 'KT', FALSE),
(@deft_id, 'EDG', FALSE);

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@deft_id, '중꺾마', '팀이 지고 있을때 기량을 보임', '+3 ALL_STATS_WHEN_LOSING'),
(@deft_id, '알파카', '타고난 재능', '+1 ALL_STATS');

-- Deft stats (ICON)
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(@deft_id, 90, 95, 93, 82, 88, 92);

-- ICON Peanut (HLE, T1, LGD, GEN)
INSERT INTO players (name, team, position, overall, region, season, market_value) VALUES
('[ICON] Peanut', 'HLE', 'JUNGLE', 118, 'LCK', 'ICON', 140000);

SET @peanut_id = LAST_INSERT_ID();

-- Peanut teams
INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@peanut_id, 'HLE', TRUE),
(@peanut_id, 'T1', FALSE),
(@peanut_id, 'LGD', FALSE),
(@peanut_id, 'GEN', FALSE);

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@peanut_id, '내가 최고야', '팀이 이기고 있을때 한타력 상승', '+10 TEAMFIGHT_WHEN_WINNING');

-- Peanut stats (ICON)
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(@peanut_id, 85, 90, 88, 85, 92, 88);

-- ============================================
-- NO RIVAL SERIES - LOWER OVR VERSIONS (NO TRAITS)
-- ============================================

-- No Rival Mystic (WE, DNF) - OVR 114
INSERT INTO players (name, team, position, overall, region, season, market_value) VALUES
('[NR] Mystic', 'WE', 'ADC', 114, 'LPL', 'NR', 80000);

SET @nr_mystic_id = LAST_INSERT_ID();

INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@nr_mystic_id, 'WE', TRUE),
(@nr_mystic_id, 'DNF', FALSE);

-- Mystic stats (No Rival)
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(@nr_mystic_id, 83, 87, 90, 70, 80, 85);

-- No Rival Deft (DRX, KT, EDG) - OVR 116
INSERT INTO players (name, team, position, overall, region, season, market_value) VALUES
('[NR] Deft', 'DRX', 'ADC', 116, 'LCK', 'NR', 95000);

SET @nr_deft_id = LAST_INSERT_ID();

INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@nr_deft_id, 'DRX', TRUE),
(@nr_deft_id, 'KT', FALSE),
(@nr_deft_id, 'EDG', FALSE);

-- Deft stats (No Rival)
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(@nr_deft_id, 85, 90, 88, 77, 83, 87);

-- No Rival Peanut (HLE, T1, LGD, GEN) - OVR 113
INSERT INTO players (name, team, position, overall, region, season, market_value) VALUES
('[NR] Peanut', 'HLE', 'JUNGLE', 113, 'LCK', 'NR', 75000);

SET @nr_peanut_id = LAST_INSERT_ID();

INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@nr_peanut_id, 'HLE', TRUE),
(@nr_peanut_id, 'T1', FALSE),
(@nr_peanut_id, 'LGD', FALSE),
(@nr_peanut_id, 'GEN', FALSE);

-- Peanut stats (No Rival)
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(@nr_peanut_id, 80, 85, 83, 80, 87, 83);

SELECT 'ICON and No Rival series players added successfully!' as Status;
