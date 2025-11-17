-- Add market prices for 19G2 season players

INSERT INTO player_market_prices (player_id, base_price, current_price, price_floor, price_ceiling)
SELECT 
  id,
  CASE 
    WHEN tier = 'LEGENDARY' THEN 2000
    WHEN tier = 'EPIC' THEN 1000
    WHEN tier = 'RARE' THEN 500
    WHEN tier = 'COMMON' THEN 200
    ELSE 100
  END as base_price,
  CASE 
    WHEN tier = 'LEGENDARY' THEN 2000
    WHEN tier = 'EPIC' THEN 1000
    WHEN tier = 'RARE' THEN 500
    WHEN tier = 'COMMON' THEN 200
    ELSE 100
  END as current_price,
  CASE 
    WHEN tier = 'LEGENDARY' THEN 1900
    WHEN tier = 'EPIC' THEN 900
    WHEN tier = 'RARE' THEN 400
    WHEN tier = 'COMMON' THEN 100
    ELSE 50
  END as price_floor,
  CASE 
    WHEN tier = 'LEGENDARY' THEN 2100
    WHEN tier = 'EPIC' THEN 1100
    WHEN tier = 'RARE' THEN 600
    WHEN tier = 'COMMON' THEN 300
    ELSE 150
  END as price_ceiling
FROM players
WHERE season = '19G2'
ON DUPLICATE KEY UPDATE
  base_price = VALUES(base_price),
  current_price = VALUES(current_price),
  price_floor = VALUES(price_floor),
  price_ceiling = VALUES(price_ceiling);
