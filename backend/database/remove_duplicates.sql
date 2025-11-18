-- Remove duplicate ICON and NR players
USE lol_card_game;

-- 먼저 중복된 선수들의 관련 데이터 삭제
-- user_cards에서 중복 ID 카드 삭제
DELETE FROM user_cards WHERE player_id IN (1068, 1069, 1070, 1071, 1072, 1073);

-- player_stats에서 중복 ID 스탯 삭제
DELETE FROM player_stats WHERE player_id IN (1068, 1069, 1070, 1071, 1072, 1073);

-- player_teams에서 중복 ID 팀 관계 삭제
DELETE FROM player_teams WHERE player_id IN (1068, 1069, 1070, 1071, 1072, 1073);

-- player_traits에서 중복 ID 특성 삭제
DELETE FROM player_traits WHERE player_id IN (1068, 1069, 1070, 1071, 1072, 1073);

-- 중복 선수 삭제
DELETE FROM players WHERE id IN (1068, 1069, 1070, 1071, 1072, 1073);

-- 결과 확인
SELECT id, name, team, position, season, overall, market_value
FROM players
WHERE name LIKE '%Mystic%' OR name LIKE '%Deft%' OR name LIKE '%Peanut%'
ORDER BY name, id;

SELECT '중복 제거 완료! 남은 선수: 6명' as Status;
