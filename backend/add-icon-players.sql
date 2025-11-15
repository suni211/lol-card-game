-- Add ICON tier players to the database
-- These are legendary players with 0.1% drop rate

INSERT INTO players (name, team, position, overall, tier, season) VALUES
-- Doublelift (TL/TSM)
('Doublelift', 'TL', 'ADC', 107, 'ICON', 'ICON'),

-- Bjergsen (TSM)
('Bjergsen', 'TSM', 'MID', 106, 'ICON', 'ICON'),

-- Uzi (RNG)
('Uzi', 'RNG', 'ADC', 110, 'ICON', 'ICON'),

-- Nuguri (DK)
('Nuguri', 'DK', 'TOP', 105, 'ICON', 'ICON'),

-- Marin (SKT/T1)
('Marin', 'T1', 'TOP', 105, 'ICON', 'ICON'),

-- Jankos (G2)
('Jankos', 'G2', 'JGL', 103, 'ICON', 'ICON'),

-- Perkz (G2)
('Perkz', 'G2', 'MID', 105, 'ICON', 'ICON'),

-- brTT (PNG)
('brTT', 'PNG', 'ADC', 100, 'ICON', 'ICON'),

-- Mata (SKT/SSG/RNG)
('Mata', 'RNG', 'SPT', 103, 'ICON', 'ICON'),

-- Madlife (CJ)
('Madlife', 'CJ', 'SPT', 102, 'ICON', 'ICON'),

-- Bengi (SKT)
('Bengi', 'T1', 'JGL', 106, 'ICON', 'ICON');

-- Verify the insertions
SELECT id, name, team, position, overall, tier, season
FROM players
WHERE tier = 'ICON'
ORDER BY overall DESC;
