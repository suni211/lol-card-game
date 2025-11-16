-- Marin의 ID 확인 및 전체 ICON 선수 ID 확인
SELECT id, name, team, position, overall, tier
FROM players
WHERE tier = 'ICON'
ORDER BY id;
