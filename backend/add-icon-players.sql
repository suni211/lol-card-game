-- Add ICON tier players to the database
-- These are legendary players with 0.1% drop rate

INSERT INTO players (name, team, position, overall, tier, season, trait1, trait2) VALUES
-- Doublelift (TL/TSM)
('Doublelift', 'TL', 'ADC', 107, 'ICON', 'ICON', '클러치', '포지셔닝'),

-- Bjergsen (TSM)
('Bjergsen', 'TSM', 'MID', 106, 'ICON', 'ICON', '딜링머신', '캐리력'),

-- Uzi (RNG)
('Uzi', 'RNG', 'ADC', 110, 'ICON', 'ICON', '딜링머신', '캐리력'),

-- Nuguri (DK)
('Nuguri', 'DK', 'TOP', 105, 'ICON', 'ICON', '캐리력', '라인전'),

-- Marin (SKT/T1)
('Marin', 'T1', 'TOP', 105, 'ICON', 'ICON', '캐리력', '라인전'),

-- Jankos (G2)
('Jankos', 'G2', 'JGL', 103, 'ICON', 'ICON', '갱킹', '오브젝트'),

-- Perkz (G2)
('Perkz', 'G2', 'MID', 105, 'ICON', 'ICON', '캐리력', '유연성'),

-- brTT (PNG)
('brTT', 'PNG', 'ADC', 100, 'ICON', 'ICON', '클러치', '포지셔닝'),

-- Mata (SKT/SSG/RNG)
('Mata', 'RNG', 'SPT', 103, 'ICON', 'ICON', '시야장악', '운영력'),

-- Madlife (CJ)
('Madlife', 'CJ', 'SPT', 102, 'ICON', 'ICON', '시야장악', '후킹'),

-- Bengi (SKT)
('Bengi', 'T1', 'JGL', 106, 'ICON', 'ICON', '오브젝트', '운영력');

-- Verify the insertions
SELECT id, name, team, position, overall, tier, season, trait1, trait2
FROM players
WHERE tier = 'ICON'
ORDER BY overall DESC;
