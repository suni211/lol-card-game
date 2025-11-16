-- ICON 선수 오버롤 +5 증가

UPDATE players SET overall = 112 WHERE name = 'Doublelift' AND tier = 'ICON';  -- 107 -> 112
UPDATE players SET overall = 111 WHERE name = 'Bjergsen' AND tier = 'ICON';    -- 106 -> 111
UPDATE players SET overall = 115 WHERE name = 'Uzi' AND tier = 'ICON';         -- 110 -> 115
UPDATE players SET overall = 110 WHERE name = 'Nuguri' AND tier = 'ICON';      -- 105 -> 110
UPDATE players SET overall = 110 WHERE name = 'Marin' AND tier = 'ICON';       -- 105 -> 110
UPDATE players SET overall = 108 WHERE name = 'Jankos' AND tier = 'ICON';      -- 103 -> 108
UPDATE players SET overall = 110 WHERE name = 'Perkz' AND tier = 'ICON';       -- 105 -> 110
UPDATE players SET overall = 105 WHERE name = 'brTT' AND tier = 'ICON';        -- 100 -> 105
UPDATE players SET overall = 108 WHERE name = 'Mata' AND tier = 'ICON';        -- 103 -> 108
UPDATE players SET overall = 107 WHERE name = 'Madlife' AND tier = 'ICON';     -- 102 -> 107
UPDATE players SET overall = 111 WHERE name = 'Bengi' AND tier = 'ICON';       -- 106 -> 111

-- 확인
SELECT name, team, position, overall, tier
FROM players
WHERE tier = 'ICON'
ORDER BY position, name;
