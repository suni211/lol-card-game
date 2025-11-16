-- ICON 선수 오버롤 다시 +5 증가

UPDATE players SET overall = 117 WHERE name = 'Doublelift' AND tier = 'ICON';  -- 112 -> 117
UPDATE players SET overall = 116 WHERE name = 'Bjergsen' AND tier = 'ICON';    -- 111 -> 116
UPDATE players SET overall = 120 WHERE name = 'Uzi' AND tier = 'ICON';         -- 115 -> 120
UPDATE players SET overall = 115 WHERE name = 'Nuguri' AND tier = 'ICON';      -- 110 -> 115
UPDATE players SET overall = 115 WHERE name = 'Marin' AND tier = 'ICON';       -- 110 -> 115
UPDATE players SET overall = 113 WHERE name = 'Jankos' AND tier = 'ICON';      -- 108 -> 113
UPDATE players SET overall = 115 WHERE name = 'Perkz' AND tier = 'ICON';       -- 110 -> 115
UPDATE players SET overall = 110 WHERE name = 'brTT' AND tier = 'ICON';        -- 105 -> 110
UPDATE players SET overall = 113 WHERE name = 'Mata' AND tier = 'ICON';        -- 108 -> 113
UPDATE players SET overall = 112 WHERE name = 'Madlife' AND tier = 'ICON';     -- 107 -> 112
UPDATE players SET overall = 116 WHERE name = 'Bengi' AND tier = 'ICON';       -- 111 -> 116

-- 확인
SELECT name, team, position, overall, tier
FROM players
WHERE tier = 'ICON'
ORDER BY overall DESC, name;
