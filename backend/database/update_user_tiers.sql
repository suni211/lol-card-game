-- Update all user tiers based on new tier system
UPDATE users
SET tier = CASE
  WHEN rating >= 9001 THEN 'CHALLENGER'
  WHEN rating >= 8001 THEN 'GRANDMASTER'
  WHEN rating >= 7001 THEN 'MASTER'
  WHEN rating >= 6001 THEN 'DIAMOND'
  WHEN rating >= 5001 THEN 'PLATINUM'
  WHEN rating >= 4001 THEN 'GOLD'
  WHEN rating >= 3001 THEN 'SILVER'
  WHEN rating >= 2001 THEN 'BRONZE'
  ELSE 'IRON'
END;
