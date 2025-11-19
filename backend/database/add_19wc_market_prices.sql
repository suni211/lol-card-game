-- Add market prices for 19WC (2019 World Championship) season players
-- Price is based on overall rating (tier calculated from overall)

INSERT INTO player_market_prices (player_id, base_price, current_price, price_floor, price_ceiling)
SELECT
  id,
  CASE
    WHEN overall > 100 THEN overall * 50  -- LEGENDARY
    WHEN overall > 90 THEN overall * 30   -- EPIC
    WHEN overall > 80 THEN overall * 20   -- RARE
    ELSE overall * 10                     -- COMMON
  END as base_price,
  CASE
    WHEN overall > 100 THEN overall * 50
    WHEN overall > 90 THEN overall * 30
    WHEN overall > 80 THEN overall * 20
    ELSE overall * 10
  END as current_price,
  CASE
    WHEN overall > 100 THEN overall * 50 - 200
    WHEN overall > 90 THEN overall * 30 - 150
    WHEN overall > 80 THEN overall * 20 - 100
    ELSE overall * 10 - 50
  END as price_floor,
  CASE
    WHEN overall > 100 THEN overall * 50 + 200
    WHEN overall > 90 THEN overall * 30 + 150
    WHEN overall > 80 THEN overall * 20 + 100
    ELSE overall * 10 + 50
  END as price_ceiling
FROM players
WHERE season = '19WC'
ON DUPLICATE KEY UPDATE
  base_price = VALUES(base_price),
  current_price = VALUES(current_price),
  price_floor = VALUES(price_floor),
  price_ceiling = VALUES(price_ceiling);

-- Confirmation
SELECT COUNT(*) as total_19wc_market_prices FROM player_market_prices pmp
JOIN players p ON pmp.player_id = p.id
WHERE p.season = '19WC';
