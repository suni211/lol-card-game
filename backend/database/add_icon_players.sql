-- Add ICON and No Rival series players
USE lol_card_game;

-- ============================================
-- ICON SERIES - LEGENDARY RETIRED PLAYERS
-- ============================================

-- ICON Mystic (WE, DNF)
INSERT INTO players (name, team, position, overall, region, season) VALUES
('Mystic', 'WE', 'ADC', 119, 'LPL', 'ICON');

SET @mystic_id = LAST_INSERT_ID();

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@mystic_id, '울트라 하이퍼 캐리', '팀이 지고있을때 엄청난 기량을 보입니다.', '+5 ALL_STATS_WHEN_LOSING'),
(@mystic_id, '팀이 이상해', '파워 레벨이 팀이 550 미만일 경우 능력치 상승', '+10 ALL_STATS_IF_TEAM_POWER_BELOW_550');

-- ICON Deft (DRX, KT, EDG)
INSERT INTO players (name, team, position, overall, region, season) VALUES
('Deft', 'DRX', 'ADC', 121, 'LCK', 'ICON');

SET @deft_id = LAST_INSERT_ID();

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@deft_id, '중꺾마', '팀이 지고 있을때 기량을 보임', '+3 ALL_STATS_WHEN_LOSING'),
(@deft_id, '알파카', '타고난 재능', '+1 ALL_STATS');

-- ICON Peanut (HLE, T1, LGD, GEN)
INSERT INTO players (name, team, position, overall, region, season) VALUES
('Peanut', 'HLE', 'JUNGLE', 118, 'LCK', 'ICON');

SET @peanut_id = LAST_INSERT_ID();

INSERT INTO player_traits (player_id, name, description, effect) VALUES
(@peanut_id, '내가 최고야', '팀이 이기고 있을때 한타력 상승', '+10 TEAMFIGHT_WHEN_WINNING');

-- ============================================
-- NO RIVAL SERIES - LOWER OVR VERSIONS (NO TRAITS)
-- ============================================

-- No Rival Mystic (DNF) - OVR 114
INSERT INTO players (name, team, position, overall, region, season) VALUES
('Mystic', 'DNF', 'ADC', 114, 'LPL', 'NR');

-- No Rival Deft (KT) - OVR 116
INSERT INTO players (name, team, position, overall, region, season) VALUES
('Deft', 'KT', 'ADC', 116, 'LCK', 'NR');

-- No Rival Peanut (T1) - OVR 113
INSERT INTO players (name, team, position, overall, region, season) VALUES
('Peanut', 'T1', 'JUNGLE', 113, 'LCK', 'NR');

SELECT 'ICON and No Rival series players added successfully!' as Status;
