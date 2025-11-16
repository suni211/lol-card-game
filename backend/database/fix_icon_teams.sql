-- ICON 선수들의 팀 정보 수정

-- Mata: RNG -> SSG (17년 우승팀)
UPDATE players SET team = 'SSG' WHERE name = 'Mata' AND tier = 'ICON';

-- 다른 ICON 선수들 팀 정보 확인 및 수정
-- Doublelift: TL
UPDATE players SET team = 'TL' WHERE name = 'Doublelift' AND tier = 'ICON';

-- Bjergsen: TSM
UPDATE players SET team = 'TSM' WHERE name = 'Bjergsen' AND tier = 'ICON';

-- Uzi: RNG
UPDATE players SET team = 'RNG' WHERE name = 'Uzi' AND tier = 'ICON';

-- Nuguri: DK
UPDATE players SET team = 'DK' WHERE name = 'Nuguri' AND tier = 'ICON';

-- Marin: T1 (SKT)
UPDATE players SET team = 'T1' WHERE name = 'Marin' AND tier = 'ICON';

-- Jankos: G2
UPDATE players SET team = 'G2' WHERE name = 'Jankos' AND tier = 'ICON';

-- Perkz: G2
UPDATE players SET team = 'G2' WHERE name = 'Perkz' AND tier = 'ICON';

-- brTT: PNG
UPDATE players SET team = 'PNG' WHERE name = 'brTT' AND tier = 'ICON';

-- Madlife: CJ
UPDATE players SET team = 'CJ' WHERE name = 'Madlife' AND tier = 'ICON';

-- Bengi: T1 (SKT)
UPDATE players SET team = 'T1' WHERE name = 'Bengi' AND tier = 'ICON';

-- 확인
SELECT name, team, position, overall, tier FROM players WHERE tier = 'ICON' ORDER BY team, position;
