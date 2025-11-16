-- ICON 등급 선수를 지정된 11명만 남기고 삭제

-- 1. 먼저 유지할 ICON 선수 목록
-- Doublelift, Bjergsen, Uzi, Nuguri, Marin, Jankos, Perkz, brTT, Mata, Madlife, Bengi

-- 2. 이 11명을 제외한 모든 ICON 선수 삭제
DELETE FROM players
WHERE tier = 'ICON'
AND name NOT IN (
    'Doublelift',
    'Bjergsen',
    'Uzi',
    'Nuguri',
    'Marin',
    'Jankos',
    'Perkz',
    'brTT',
    'Mata',
    'Madlife',
    'Bengi'
);

-- 3. ICON 선수 정보 업데이트 (정확한 팀 정보)
UPDATE players SET team = 'TL', position = 'ADC', overall = 107, trait1 = '클러치', trait2 = '포지셔닝'
WHERE name = 'Doublelift' AND tier = 'ICON';

UPDATE players SET team = 'TSM', position = 'MID', overall = 106, trait1 = '딜링머신', trait2 = '캐리력'
WHERE name = 'Bjergsen' AND tier = 'ICON';

UPDATE players SET team = 'RNG', position = 'ADC', overall = 110, trait1 = '딜링머신', trait2 = '캐리력'
WHERE name = 'Uzi' AND tier = 'ICON';

UPDATE players SET team = 'DK', position = 'TOP', overall = 105, trait1 = '캐리력', trait2 = '라인전'
WHERE name = 'Nuguri' AND tier = 'ICON';

UPDATE players SET team = 'T1', position = 'TOP', overall = 105, trait1 = '캐리력', trait2 = '라인전'
WHERE name = 'Marin' AND tier = 'ICON';

UPDATE players SET team = 'G2', position = 'JUNGLE', overall = 103, trait1 = '갱킹', trait2 = '오브젝트'
WHERE name = 'Jankos' AND tier = 'ICON';

UPDATE players SET team = 'G2', position = 'MID', overall = 105, trait1 = '캐리력', trait2 = '유연성'
WHERE name = 'Perkz' AND tier = 'ICON';

UPDATE players SET team = 'PNG', position = 'ADC', overall = 100, trait1 = '클러치', trait2 = '포지셔닝'
WHERE name = 'brTT' AND tier = 'ICON';

UPDATE players SET team = 'SSG', position = 'SUPPORT', overall = 103, trait1 = '시야장악', trait2 = '운영력'
WHERE name = 'Mata' AND tier = 'ICON';

UPDATE players SET team = 'CJ', position = 'SUPPORT', overall = 102, trait1 = '시야장악', trait2 = '후킹'
WHERE name = 'Madlife' AND tier = 'ICON';

UPDATE players SET team = 'T1', position = 'JUNGLE', overall = 106, trait1 = '오브젝트', trait2 = '운영력'
WHERE name = 'Bengi' AND tier = 'ICON';

-- 4. 모든 ICON 선수의 region과 season 설정
UPDATE players SET region = 'ICON', season = 'ICON' WHERE tier = 'ICON';

-- 5. 확인
SELECT name, team, position, overall, tier, region, season, trait1, trait2
FROM players
WHERE tier = 'ICON'
ORDER BY position, name;
