-- ICON 선수 중복 제거 및 region 수정

-- 1. region 컬럼에 'ICON' 값 추가
ALTER TABLE players MODIFY COLUMN region ENUM('LCK','LTA','LPL','LEC','LCP','ICON') NOT NULL DEFAULT 'LCK';

-- 2. 중복 ICON 선수 삭제 (ID가 가장 작은 것만 남기고 나머지 삭제)
DELETE p1 FROM players p1
INNER JOIN players p2
WHERE p1.tier = 'ICON'
  AND p2.tier = 'ICON'
  AND p1.name = p2.name
  AND p1.id > p2.id;

-- 3. ICON 선수 정보 업데이트
UPDATE players SET region = 'ICON', season = 'ICON' WHERE tier = 'ICON';

-- 4. 유저가 보유한 ICON 카드 중 삭제된 선수 ID를 새로운 선수 ID로 업데이트
-- (user_cards 테이블의 player_id를 유효한 ID로 변경)

-- Marin
UPDATE user_cards uc
SET uc.player_id = (SELECT id FROM players WHERE name = 'Marin' AND tier = 'ICON' LIMIT 1)
WHERE uc.player_id IN (SELECT id FROM players WHERE name = 'Marin' AND tier = 'ICON');

-- MaRin (Marin과 동일인물)
UPDATE user_cards uc
SET uc.player_id = (SELECT id FROM players WHERE name = 'Marin' AND tier = 'ICON' LIMIT 1)
WHERE uc.player_id IN (SELECT id FROM players WHERE name = 'MaRin' AND tier = 'ICON');

-- MaRin 삭제 (Marin으로 통일)
DELETE FROM players WHERE name = 'MaRin' AND tier = 'ICON';

-- Nuguri
UPDATE user_cards uc
SET uc.player_id = (SELECT id FROM players WHERE name = 'Nuguri' AND tier = 'ICON' LIMIT 1)
WHERE uc.player_id IN (SELECT id FROM players WHERE name = 'Nuguri' AND tier = 'ICON');

-- Bengi
UPDATE user_cards uc
SET uc.player_id = (SELECT id FROM players WHERE name = 'Bengi' AND tier = 'ICON' LIMIT 1)
WHERE uc.player_id IN (SELECT id FROM players WHERE name = 'Bengi' AND tier = 'ICON');

-- Perkz
UPDATE user_cards uc
SET uc.player_id = (SELECT id FROM players WHERE name = 'Perkz' AND tier = 'ICON' LIMIT 1)
WHERE uc.player_id IN (SELECT id FROM players WHERE name = 'Perkz' AND tier = 'ICON');

-- Uzi
UPDATE user_cards uc
SET uc.player_id = (SELECT id FROM players WHERE name = 'Uzi' AND tier = 'ICON' LIMIT 1)
WHERE uc.player_id IN (SELECT id FROM players WHERE name = 'Uzi' AND tier = 'ICON');

-- MadLife (Madlife로 통일)
UPDATE user_cards uc
SET uc.player_id = (SELECT id FROM players WHERE name = 'Madlife' AND tier = 'ICON' LIMIT 1)
WHERE uc.player_id IN (SELECT id FROM players WHERE name = 'MadLife' AND tier = 'ICON');

-- MadLife 삭제
DELETE FROM players WHERE name = 'MadLife' AND tier = 'ICON';

-- Mata
UPDATE user_cards uc
SET uc.player_id = (SELECT id FROM players WHERE name = 'Mata' AND tier = 'ICON' LIMIT 1)
WHERE uc.player_id IN (SELECT id FROM players WHERE name = 'Mata' AND tier = 'ICON');

-- 5. 최종 확인
SELECT name, team, position, overall, region, season, trait1, trait2
FROM players
WHERE tier = 'ICON'
ORDER BY position, name;

-- 6. 유저 카드 확인 (ICON 카드 보유 유저)
SELECT u.username, p.name, p.team, p.position, uc.level
FROM user_cards uc
JOIN players p ON uc.player_id = p.id
JOIN users u ON uc.user_id = u.id
WHERE p.tier = 'ICON'
ORDER BY u.username, p.name;
