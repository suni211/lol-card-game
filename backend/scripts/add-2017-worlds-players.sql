-- 2017 World Championship Players
-- tier 컬럼 제거 (DB에 없음)

INSERT INTO players (name, team, position, overall, salary, season, region,
                     laning, teamfight, macro, mechanics, vision, consistency, clutch, adaptability, traits)
VALUES
-- Edward Gaming (EDG)
('Mouse', 'EDG', 'TOP', 71, 6, '17WC', 'LPL', 73, 72, 68, 70, 65, 71, 69, 70, NULL),
('Clearlove7', 'EDG', 'JUNGLE', 70, 6, '17WC', 'LPL', 65, 72, 75, 68, 73, 71, 70, 72, NULL),
('Scout', 'EDG', 'MID', 76, 6, '17WC', 'LPL', 78, 77, 73, 80, 71, 76, 75, 78, NULL),
('iBoy', 'EDG', 'ADC', 72, 7, '17WC', 'LPL', 70, 75, 68, 77, 66, 72, 71, 73, NULL),
('Meiko', 'EDG', 'SUPPORT', 70, 6, '17WC', 'LPL', 66, 72, 71, 68, 76, 70, 69, 72, NULL),

-- Royal Never Give Up (RNG)
('Letme', 'RNG', 'TOP', 92, 19, '17WC', 'LPL', 94, 95, 88, 93, 85, 93, 91, 93, NULL),
('Mlxg', 'RNG', 'JUNGLE', 95, 20, '17WC', 'LPL', 88, 98, 96, 92, 99, 93, 97, 95, '중국 최고 정글'),
('Xiaohu', 'RNG', 'MID', 93, 20, '17WC', 'LPL', 96, 94, 89, 98, 87, 92, 92, 95, NULL),
('Uzi', 'RNG', 'ADC', 94, 22, '17WC', 'LPL', 92, 99, 86, 100, 83, 94, 97, 95, NULL),
('Ming', 'RNG', 'SUPPORT', 90, 22, '17WC', 'LPL', 86, 93, 92, 87, 98, 91, 90, 93, NULL),

-- Team WE (WE)
('957', 'WE', 'TOP', 95, 19, '17WC', 'LPL', 97, 98, 91, 96, 88, 96, 94, 96, NULL),
('Condi', 'WE', 'JUNGLE', 90, 20, '17WC', 'LPL', 85, 93, 92, 88, 95, 90, 91, 91, NULL),
('xiye', 'WE', 'MID', 91, 18, '17WC', 'LPL', 94, 92, 87, 96, 85, 90, 91, 93, NULL),
('Mystic', 'WE', 'ADC', 94, 19, '17WC', 'LPL', 92, 98, 86, 99, 84, 93, 96, 94, '무작위 한타'),
('Ben', 'WE', 'SUPPORT', 90, 20, '17WC', 'LPL', 86, 93, 92, 87, 96, 90, 91, 91, NULL),
('Zero', 'WE', 'SUPPORT', 90, 17, '17WC', 'LPL', 86, 92, 91, 87, 95, 91, 90, 90, NULL),

-- Flash Wolves (FW)
('MMD', 'FW', 'TOP', 64, 8, '17WC', 'LMS', 66, 65, 61, 64, 58, 65, 62, 63, NULL),
('Karsa', 'FW', 'JUNGLE', 70, 8, '17WC', 'LMS', 65, 72, 74, 68, 75, 70, 71, 72, NULL),
('Maple', 'FW', 'MID', 71, 8, '17WC', 'LMS', 73, 72, 68, 75, 66, 70, 70, 74, NULL),
('Betty', 'FW', 'ADC', 65, 5, '17WC', 'LMS', 64, 67, 61, 69, 59, 65, 63, 66, NULL),
('SwordArt', 'FW', 'SUPPORT', 65, 5, '17WC', 'LMS', 61, 67, 66, 63, 71, 65, 63, 67, NULL),

-- ahq e-Sports Club (AHQ)
('Ziv', 'AHQ', 'TOP', 66, 6, '17WC', 'LMS', 68, 67, 63, 66, 60, 67, 64, 65, NULL),
('Mountain', 'AHQ', 'JUNGLE', 67, 6, '17WC', 'LMS', 62, 69, 70, 65, 72, 67, 66, 68, NULL),
('Chawy', 'AHQ', 'MID', 65, 6, '17WC', 'LMS', 67, 66, 63, 69, 61, 64, 63, 67, NULL),
('AN', 'AHQ', 'ADC', 60, 5, '17WC', 'LMS', 59, 62, 56, 64, 54, 60, 58, 61, NULL),
('Albis', 'AHQ', 'SUPPORT', 61, 5, '17WC', 'LMS', 57, 63, 62, 59, 68, 61, 59, 63, NULL),

-- Hong Kong Attitude (HKA)
('Riris', 'HKA', 'TOP', 65, 6, '17WC', 'LMS', 67, 66, 62, 65, 59, 66, 63, 64, NULL),
('GodKwai', 'HKA', 'JUNGLE', 61, 6, '17WC', 'LMS', 56, 63, 65, 59, 68, 61, 60, 62, NULL),
('M1ssion', 'HKA', 'MID', 62, 6, '17WC', 'LMS', 64, 63, 60, 66, 58, 61, 60, 64, NULL),
('Unified', 'HKA', 'ADC', 61, 6, '17WC', 'LMS', 60, 63, 57, 65, 55, 61, 59, 62, NULL),
('Kaiwing', 'HKA', 'SUPPORT', 60, 5, '17WC', 'LMS', 56, 62, 61, 58, 67, 60, 58, 62, NULL),
('Gemini', 'HKA', 'JUNGLE', 55, 5, '17WC', 'LMS', 50, 57, 59, 53, 62, 55, 54, 56, NULL),

-- Team SoloMid (TSM)
('Hauntzer', 'TSM', 'TOP', 70, 6, '17WC', 'LCS', 72, 71, 67, 71, 64, 70, 69, 70, NULL),
('Svenskeren', 'TSM', 'JUNGLE', 71, 6, '17WC', 'LCS', 66, 73, 74, 69, 75, 70, 71, 72, NULL),
('Bjergsen', 'TSM', 'MID', 73, 7, '17WC', 'LCS', 75, 74, 70, 78, 68, 73, 72, 76, NULL),
('Doublelift', 'TSM', 'ADC', 71, 6, '17WC', 'LCS', 69, 74, 66, 76, 63, 72, 71, 74, NULL),
('Biofrost', 'TSM', 'SUPPORT', 70, 5, '17WC', 'LCS', 66, 72, 71, 68, 75, 69, 68, 71, NULL),

-- Immortals (IMT)
('Flame', 'IMT', 'TOP', 73, 7, '17WC', 'LCS', 75, 74, 70, 74, 67, 73, 71, 73, NULL),
('Xmithie', 'IMT', 'JUNGLE', 71, 6, '17WC', 'LCS', 66, 73, 74, 69, 75, 70, 71, 72, NULL),
('Pobelter', 'IMT', 'MID', 72, 7, '17WC', 'LCS', 74, 73, 69, 76, 67, 71, 70, 74, NULL),
('Cody Sun', 'IMT', 'ADC', 65, 5, '17WC', 'LCS', 64, 67, 61, 69, 59, 65, 63, 66, NULL),
('Olleh', 'IMT', 'SUPPORT', 65, 6, '17WC', 'LCS', 61, 67, 66, 63, 71, 65, 63, 67, NULL),

-- Cloud9 (C9)
('Impact', 'C9', 'TOP', 89, 9, '17WC', 'LCS', 91, 92, 85, 90, 82, 90, 88, 90, NULL),
('Contractz', 'C9', 'JUNGLE', 85, 9, '17WC', 'LCS', 80, 88, 87, 84, 90, 85, 86, 86, NULL),
('Jensen', 'C9', 'MID', 86, 9, '17WC', 'LCS', 89, 87, 82, 92, 80, 86, 85, 88, NULL),
('Sneaky', 'C9', 'ADC', 85, 8, '17WC', 'LCS', 83, 88, 79, 90, 77, 86, 87, 87, NULL),
('Smoothie', 'C9', 'SUPPORT', 83, 8, '17WC', 'LCS', 79, 86, 85, 81, 90, 83, 83, 85, NULL),

-- Longzhu Gaming (LZ)
('Khan', 'LZ', 'TOP', 93, 16, '17WC', 'LCK', 96, 95, 88, 98, 86, 92, 94, 95, NULL),
('Cuzz', 'LZ', 'JUNGLE', 91, 15, '17WC', 'LCK', 86, 94, 93, 89, 96, 90, 92, 91, NULL),
('Bdd', 'LZ', 'MID', 92, 16, '17WC', 'LCK', 95, 93, 88, 97, 86, 91, 91, 93, NULL),
('PraY', 'LZ', 'ADC', 93, 18, '17WC', 'LCK', 91, 96, 86, 98, 84, 94, 95, 93, NULL),
('GorillA', 'LZ', 'SUPPORT', 90, 16, '17WC', 'LCK', 86, 93, 92, 87, 96, 91, 90, 91, NULL),

-- SK Telecom T1 (SKT)
('Huni', 'SKT', 'TOP', 96, 18, '17WC', 'LCK', 98, 99, 92, 100, 89, 96, 97, 98, NULL),
('17WC Peanut', 'SKT', 'JUNGLE', 95, 19, '17WC', 'LCK', 90, 98, 96, 93, 98, 94, 96, 95, NULL),
('Faker', 'SKT', 'MID', 101, 23, '17WC', 'LCK', 105, 103, 96, 108, 94, 101, 104, 102, NULL),
('Bang', 'SKT', 'ADC', 100, 22, '17WC', 'LCK', 98, 104, 92, 106, 88, 100, 102, 100, NULL),
('Wolf', 'SKT', 'SUPPORT', 90, 16, '17WC', 'LCK', 86, 93, 92, 87, 96, 90, 90, 91, NULL),

-- Samsung Galaxy (SSG)
('CuVee', 'SSG', 'TOP', 99, 20, '17WC', 'LCK', 101, 102, 95, 101, 92, 100, 99, 100, NULL),
('Ambition', 'SSG', 'JUNGLE', 100, 20, '17WC', 'LCK', 94, 103, 104, 98, 105, 101, 102, 101, '뚫고 지나가.'),
('Crown', 'SSG', 'MID', 100, 21, '17WC', 'LCK', 103, 101, 96, 105, 92, 101, 100, 100, '나도 최강이야.'),
('Ruler', 'SSG', 'ADC', 105, 23, '17WC', 'LCK', 103, 108, 96, 110, 92, 106, 107, 104, NULL),
('CoreJJ', 'SSG', 'SUPPORT', 101, 21, '17WC', 'LCK', 96, 104, 103, 98, 108, 102, 101, 102, NULL),
('Haru', 'SSG', 'JUNGLE', 93, 19, '17WC', 'LCK', 88, 96, 94, 91, 97, 92, 93, 92, NULL),

-- G2 Esports (G2)
('Expect', 'G2', 'TOP', 81, 15, '17WC', 'LEC', 83, 82, 77, 82, 74, 81, 80, 81, NULL),
('Trick', 'G2', 'JUNGLE', 77, 13, '17WC', 'LEC', 72, 80, 80, 75, 82, 77, 78, 79, NULL),
('Perkz', 'G2', 'MID', 76, 13, '17WC', 'LEC', 79, 77, 73, 81, 71, 75, 75, 78, NULL),
('Zven', 'G2', 'ADC', 77, 14, '17WC', 'LEC', 75, 80, 72, 82, 69, 77, 79, 78, NULL),
('mithy', 'G2', 'SUPPORT', 75, 12, '17WC', 'LEC', 71, 78, 77, 73, 83, 75, 75, 77, NULL),

-- Misfits (MSF)
('Alphari', 'MSF', 'TOP', 85, 17, '17WC', 'LEC', 87, 86, 81, 86, 78, 85, 84, 85, NULL),
('Maxlore', 'MSF', 'JUNGLE', 83, 15, '17WC', 'LEC', 78, 86, 86, 81, 88, 83, 84, 83, NULL),
('PowerOfEvil', 'MSF', 'MID', 85, 17, '17WC', 'LEC', 88, 86, 81, 90, 79, 84, 85, 85, NULL),
('Hans Sama', 'MSF', 'ADC', 86, 17, '17WC', 'LEC', 84, 89, 79, 91, 77, 86, 87, 87, NULL),
('IgNar', 'MSF', 'SUPPORT', 86, 17, '17WC', 'LEC', 81, 88, 87, 84, 92, 86, 85, 87, NULL),

-- Fnatic (FNC)
('sOAZ', 'FNC', 'TOP', 86, 18, '17WC', 'LEC', 88, 87, 82, 86, 79, 85, 85, 86, NULL),
('Broxah', 'FNC', 'JUNGLE', 85, 18, '17WC', 'LEC', 80, 88, 87, 84, 90, 85, 85, 85, NULL),
('Caps', 'FNC', 'MID', 88, 18, '17WC', 'LEC', 91, 89, 84, 93, 82, 88, 88, 89, NULL),
('Rekkles', 'FNC', 'ADC', 90, 19, '17WC', 'LEC', 88, 93, 83, 95, 80, 91, 92, 90, NULL),
('Jesiz', 'FNC', 'SUPPORT', 90, 19, '17WC', 'LEC', 86, 93, 91, 87, 95, 90, 90, 90, NULL),

-- GIGABYTE Marines (GAM)
('Archie', 'GAM', 'TOP', 80, 16, '17WC', 'VCS', 82, 81, 76, 81, 73, 80, 79, 80, NULL),
('Levi', 'GAM', 'JUNGLE', 86, 18, '17WC', 'VCS', 81, 89, 88, 84, 91, 86, 87, 87, NULL),
('Optimus', 'GAM', 'MID', 77, 16, '17WC', 'VCS', 79, 77, 74, 81, 72, 76, 76, 78, NULL),
('Noway', 'GAM', 'ADC', 77, 16, '17WC', 'VCS', 75, 80, 72, 81, 69, 77, 78, 78, NULL),
('Sya', 'GAM', 'SUPPORT', 75, 15, '17WC', 'VCS', 71, 78, 77, 73, 82, 75, 75, 77, NULL),

-- Young Generation (YG)
('Ren', 'YG', 'TOP', 66, 7, '17WC', 'LPL', 68, 67, 63, 66, 60, 67, 64, 65, NULL),
('Venus', 'YG', 'JUNGLE', 65, 7, '17WC', 'LPL', 60, 67, 68, 63, 71, 65, 64, 66, NULL),
('Naul', 'YG', 'MID', 63, 6, '17WC', 'LPL', 65, 64, 61, 67, 59, 62, 61, 65, NULL),
('BigKoro', 'YG', 'ADC', 62, 6, '17WC', 'LPL', 61, 64, 58, 66, 55, 62, 61, 63, NULL),
('Palette', 'YG', 'SUPPORT', 62, 6, '17WC', 'LPL', 58, 64, 63, 60, 69, 62, 61, 64, NULL),

-- 1907 Fenerbahce (FB)
('Thaldrin', 'FB', 'TOP', 72, 8, '17WC', 'LEC', 74, 73, 69, 72, 66, 72, 70, 72, NULL),
('Crash', 'FB', 'JUNGLE', 71, 8, '17WC', 'LEC', 66, 73, 74, 69, 75, 70, 71, 72, NULL),
('Frozen', 'FB', 'MID', 72, 8, '17WC', 'LEC', 74, 73, 69, 76, 67, 71, 70, 74, NULL),
('Padden', 'FB', 'ADC', 71, 7, '17WC', 'LEC', 69, 74, 66, 75, 63, 71, 71, 73, NULL),
('Japone', 'FB', 'SUPPORT', 70, 7, '17WC', 'LEC', 66, 72, 71, 68, 75, 69, 68, 71, NULL),

-- Gambit Esports (GMB)
('PvPStejos', 'GMB', 'TOP', 65, 6, '17WC', 'LEC', 67, 66, 62, 65, 59, 66, 63, 64, NULL),
('Diamondprox', 'GMB', 'JUNGLE', 66, 6, '17WC', 'LEC', 61, 68, 70, 64, 72, 66, 65, 67, NULL),
('Kira', 'GMB', 'MID', 66, 6, '17WC', 'LEC', 68, 67, 64, 70, 62, 65, 64, 67, NULL),
('Blasting', 'GMB', 'ADC', 62, 5, '17WC', 'LEC', 61, 64, 58, 66, 55, 62, 61, 63, NULL),
('EDward', 'GMB', 'SUPPORT', 63, 5, '17WC', 'LEC', 59, 65, 64, 61, 70, 63, 62, 65, NULL),

-- Team oNe eSports (TNS)
('VVvert', 'TNS', 'TOP', 63, 5, '17WC', 'CBLOL', 65, 64, 60, 63, 57, 64, 61, 62, NULL),
('4LaN', 'TNS', 'JUNGLE', 62, 5, '17WC', 'CBLOL', 57, 64, 65, 60, 68, 62, 61, 63, NULL),
('Brucer', 'TNS', 'MID', 61, 5, '17WC', 'CBLOL', 63, 62, 59, 65, 57, 60, 59, 63, NULL),
('Absolut', 'TNS', 'ADC', 60, 5, '17WC', 'CBLOL', 59, 62, 56, 64, 54, 60, 59, 61, NULL),
('Redbert', 'TNS', 'SUPPORT', 61, 5, '17WC', 'CBLOL', 57, 63, 62, 59, 68, 61, 60, 63, NULL),

-- Lyon Gaming (LYN)
('Jirall', 'LYN', 'TOP', 65, 5, '17WC', 'CBLOL', 67, 66, 62, 65, 59, 66, 63, 64, NULL),
('Oddie', 'LYN', 'JUNGLE', 65, 5, '17WC', 'CBLOL', 60, 67, 68, 63, 71, 65, 64, 66, NULL),
('Seiya', 'LYN', 'MID', 66, 5, '17WC', 'CBLOL', 68, 67, 64, 70, 62, 65, 64, 67, NULL),
('WhiteLotus', 'LYN', 'ADC', 66, 5, '17WC', 'CBLOL', 65, 68, 62, 70, 59, 66, 66, 67, NULL),
('Genthix', 'LYN', 'SUPPORT', 65, 5, '17WC', 'CBLOL', 61, 67, 66, 63, 71, 65, 63, 67, NULL),

-- Kaos Latin Gaming (KLG)
('MANTARRYA', 'KLG', 'TOP', 66, 5, '17WC', 'CBLOL', 68, 67, 63, 66, 60, 67, 64, 65, NULL),
('Tirewulf', 'KLG', 'JUNGLE', 66, 5, '17WC', 'CBLOL', 61, 68, 69, 64, 72, 66, 65, 67, NULL),
('Plugo', 'KLG', 'MID', 58, 5, '17WC', 'CBLOL', 60, 59, 56, 62, 54, 57, 56, 60, NULL),
('Fix', 'KLG', 'ADC', 60, 5, '17WC', 'CBLOL', 59, 62, 56, 64, 54, 60, 59, 61, NULL),
('Slow', 'KLG', 'SUPPORT', 65, 6, '17WC', 'CBLOL', 61, 67, 66, 63, 71, 65, 63, 67, NULL),

-- Dire Wolves (DW)
('Chippys', 'DW', 'TOP', 66, 5, '17WC', 'LCP', 68, 67, 63, 66, 60, 67, 64, 65, NULL),
('Shernfire', 'DW', 'JUNGLE', 65, 5, '17WC', 'LCP', 60, 67, 68, 63, 71, 65, 64, 66, NULL),
('Phantiks', 'DW', 'MID', 66, 5, '17WC', 'LCP', 68, 67, 64, 70, 62, 65, 64, 67, NULL),
('K1ng', 'DW', 'ADC', 61, 5, '17WC', 'LCP', 60, 63, 57, 65, 55, 61, 59, 62, NULL),
('Destiny', 'DW', 'SUPPORT', 60, 5, '17WC', 'LCP', 56, 62, 61, 58, 67, 60, 59, 62, NULL),

-- Rampage (RPG)
('Evi', 'RPG', 'TOP', 61, 5, '17WC', 'LJL', 63, 62, 58, 61, 55, 62, 59, 60, NULL),
('Tussle', 'RPG', 'JUNGLE', 61, 5, '17WC', 'LJL', 56, 63, 64, 59, 67, 61, 60, 62, NULL),
('Ramune', 'RPG', 'MID', 60, 5, '17WC', 'LJL', 62, 61, 58, 64, 56, 59, 58, 62, NULL),
('YutoriMoyasi', 'RPG', 'ADC', 58, 5, '17WC', 'LJL', 57, 60, 54, 62, 52, 58, 57, 59, NULL),
('Dara', 'RPG', 'SUPPORT', 55, 5, '17WC', 'LJL', 51, 57, 56, 53, 62, 55, 54, 57, NULL);
