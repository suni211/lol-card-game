-- Add market prices for 19G2 season players
-- Price is based on overall rating: overall * 20

INSERT INTO player_market_prices (player_id, base_price, current_price, price_floor, price_ceiling)
SELECT
  id,
  overall * 20 as base_price,
  overall * 20 as current_price,
  overall * 20 - 100 as price_floor,
  overall * 20 + 100 as price_ceiling
FROM players
WHERE season = '19G2'
ON DUPLICATE KEY UPDATE
  base_price = VALUES(base_price),
  current_price = VALUES(current_price),
  price_floor = VALUES(price_floor),
  price_ceiling = VALUES(price_ceiling);
