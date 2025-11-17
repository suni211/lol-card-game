-- Fix 18WC Season Tiers Based on Overall
-- 1-80: COMMON
-- 81-90: RARE
-- 91-100: EPIC
-- 101+: LEGENDARY

USE lol_card_game;

-- Update all 18WC players' tiers based on overall rating
UPDATE players
SET tier = CASE
    WHEN overall <= 80 THEN 'COMMON'
    WHEN overall <= 90 THEN 'RARE'
    WHEN overall <= 100 THEN 'EPIC'
    ELSE 'LEGENDARY'
END
WHERE season = '18WC';
