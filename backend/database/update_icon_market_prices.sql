-- Update market prices for ICON tier players
-- ICON tier uses overall-based pricing (overall * 250)
-- This makes them more expensive than LEGENDARY (tier-based ~2000P)
-- ICON overall 범위: 105-120 → 가격 범위: 26,250P ~ 30,000P

-- Delete existing ICON player prices to recalculate
DELETE pmp FROM player_market_prices pmp
JOIN players p ON pmp.player_id = p.id
WHERE p.tier = 'ICON';

-- Insert ICON tier prices based on overall
INSERT INTO player_market_prices (player_id, base_price, current_price, price_floor, price_ceiling)
SELECT
  id,
  overall * 250 AS base_price,
  overall * 250 AS current_price,
  overall * 200 AS price_floor,
  overall * 350 AS price_ceiling
FROM players
WHERE tier = 'ICON';
