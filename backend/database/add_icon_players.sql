-- Add ICON and No Rival series players
USE lol_card_game;

-- ============================================
-- ICON SERIES - LEGENDARY RETIRED PLAYERS
-- ============================================

-- ICON Mystic (WE, DNF)
INSERT INTO players (name, team, position, overall, region, season) VALUES
('Mystic', 'WE', 'ADC', 119, 'LPL', 'ICON');

SET @mystic_id = LAST_INSERT_ID();

-- Mystic teams
INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@mystic_id, 'WE', TRUE),
(@mystic_id, 'DNF', FALSE);

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@mystic_id, '울트라 하이퍼 캐리', '팀이 지고있을때 엄청난 기량을 보입니다.', '+5 ALL_STATS_WHEN_LOSING'),
(@mystic_id, '팀이 이상해', '파워 레벨이 팀이 550 미만일 경우 능력치 상승', '+10 ALL_STATS_IF_TEAM_POWER_BELOW_550');

-- ICON Deft (DRX, KT, EDG)
INSERT INTO players (name, team, position, overall, region, season) VALUES
('Deft', 'DRX', 'ADC', 121, 'LCK', 'ICON');

SET @deft_id = LAST_INSERT_ID();

-- Deft teams
INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@deft_id, 'DRX', TRUE),
(@deft_id, 'KT', FALSE),
(@deft_id, 'EDG', FALSE);

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@deft_id, '중꺾마', '팀이 지고 있을때 기량을 보임', '+3 ALL_STATS_WHEN_LOSING'),
(@deft_id, '알파카', '타고난 재능', '+1 ALL_STATS');

-- ICON Peanut (HLE, T1, LGD, GEN)
INSERT INTO players (name, team, position, overall, region, season) VALUES
('Peanut', 'HLE', 'JUNGLE', 118, 'LCK', 'ICON');

SET @peanut_id = LAST_INSERT_ID();

-- Peanut teams
INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@peanut_id, 'HLE', TRUE),
(@peanut_id, 'T1', FALSE),
(@peanut_id, 'LGD', FALSE),
(@peanut_id, 'GEN', FALSE);

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@peanut_id, '내가 최고야', '팀이 이기고 있을때 한타력 상승', '+10 TEAMFIGHT_WHEN_WINNING');

-- ============================================
-- NO RIVAL SERIES - LOWER OVR VERSIONS (NO TRAITS)
-- ============================================

-- No Rival Mystic (WE, DNF) - OVR 114
INSERT INTO players (name, team, position, overall, region, season) VALUES
('Mystic', 'WE', 'ADC', 114, 'LPL', 'NR');

SET @nr_mystic_id = LAST_INSERT_ID();

INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@nr_mystic_id, 'WE', TRUE),
(@nr_mystic_id, 'DNF', FALSE);

-- No Rival Deft (DRX, KT, EDG) - OVR 116
INSERT INTO players (name, team, position, overall, region, season) VALUES
('Deft', 'DRX', 'ADC', 116, 'LCK', 'NR');

SET @nr_deft_id = LAST_INSERT_ID();

INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@nr_deft_id, 'DRX', TRUE),
(@nr_deft_id, 'KT', FALSE),
(@nr_deft_id, 'EDG', FALSE);

-- No Rival Peanut (HLE, T1, LGD, GEN) - OVR 113
INSERT INTO players (name, team, position, overall, region, season) VALUES
('Peanut', 'HLE', 'JUNGLE', 113, 'LCK', 'NR');

SET @nr_peanut_id = LAST_INSERT_ID();

INSERT INTO player_teams (player_id, team_name, is_primary) VALUES
(@nr_peanut_id, 'HLE', TRUE),
(@nr_peanut_id, 'T1', FALSE),
(@nr_peanut_id, 'LGD', FALSE),
(@nr_peanut_id, 'GEN', FALSE);

SELECT 'ICON and No Rival series players added successfully!' as Status;
