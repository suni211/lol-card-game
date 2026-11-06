-- Initialize price rows for the three active 2026 series only.
-- Re-runnable: existing prices, volumes, and transaction history are preserved.
-- Run after the 2026 Worlds and global LIVE roster migrations.
USE lol_card_game;

INSERT INTO player_market_prices
  (player_id, base_price, current_price, price_floor, price_ceiling)
SELECT p.id, q.base_price, q.base_price, q.floor_price, q.ceiling_price
FROM players p
JOIN (
  SELECT id,
    CASE tier
      WHEN 'ICON' THEN 5000
      WHEN 'LEGENDARY' THEN 2000
      WHEN 'EPIC' THEN 1000
      WHEN 'RARE' THEN 500
      ELSE 300
    END AS base_price,
    CASE tier
      WHEN 'ICON' THEN 4500
      WHEN 'LEGENDARY' THEN 1900
      WHEN 'EPIC' THEN 900
      WHEN 'RARE' THEN 400
      ELSE 200
    END AS floor_price,
    CASE tier
      WHEN 'ICON' THEN 5500
      WHEN 'LEGENDARY' THEN 2100
      WHEN 'EPIC' THEN 1100
      WHEN 'RARE' THEN 600
      ELSE 400
    END AS ceiling_price
  FROM players
  WHERE season IN ('26 LIVE', '26WR', '26WRs')
) q ON q.id=p.id
LEFT JOIN player_market_prices existing ON existing.player_id=p.id
WHERE existing.player_id IS NULL;

SELECT p.season, COUNT(*) AS cards_with_prices
FROM players p JOIN player_market_prices mp ON mp.player_id=p.id
WHERE p.season IN ('26 LIVE', '26WR', '26WRs')
GROUP BY p.season;
