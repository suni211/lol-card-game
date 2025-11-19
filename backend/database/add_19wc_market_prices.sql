-- Add market prices for 19WC (2019 World Championship) season players
-- Price is based on tier multiplier and overall rating

INSERT INTO player_market_prices (player_id, base_price, current_price, price_floor, price_ceiling)
SELECT
  id,
  CASE
    WHEN tier = 'LEGENDARY' THEN overall * 50
    WHEN tier = 'EPIC' THEN overall * 30
    WHEN tier = 'RARE' THEN overall * 20
    WHEN tier = 'COMMON' THEN overall * 10
    ELSE overall * 5
  END as base_price,
  CASE
    WHEN tier = 'LEGENDARY' THEN overall * 50
    WHEN tier = 'EPIC' THEN overall * 30
    WHEN tier = 'RARE' THEN overall * 20
    WHEN tier = 'COMMON' THEN overall * 10
    ELSE overall * 5
  END as current_price,
  CASE
    WHEN tier = 'LEGENDARY' THEN overall * 50 - 200
    WHEN tier = 'EPIC' THEN overall * 30 - 150
    WHEN tier = 'RARE' THEN overall * 20 - 100
    WHEN tier = 'COMMON' THEN overall * 10 - 50
    ELSE overall * 5 - 25
  END as price_floor,
  CASE
    WHEN tier = 'LEGENDARY' THEN overall * 50 + 200
    WHEN tier = 'EPIC' THEN overall * 30 + 150
    WHEN tier = 'RARE' THEN overall * 20 + 100
    WHEN tier = 'COMMON' THEN overall * 10 + 50
    ELSE overall * 5 + 25
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
