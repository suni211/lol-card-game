-- Compensation for users who lost 19G2 cards
-- Run this AFTER identifying affected users

USE lol_card_game;

-- Step 1: Find users who got 19G2 but don't have it now
CREATE TEMPORARY TABLE affected_users AS
SELECT DISTINCT gh.user_id, u.username
FROM gacha_history gh
JOIN players p ON gh.player_id = p.id
JOIN users u ON gh.user_id = u.id
WHERE p.season = '19G2'
AND gh.user_id NOT IN (
  SELECT DISTINCT user_id
  FROM user_cards uc
  JOIN players p2 ON uc.player_id = p2.id
  WHERE p2.season = '19G2'
);

-- Step 2: Show affected users
SELECT * FROM affected_users;

-- Step 3: Option A - Give them back their 19G2 cards from gacha history
INSERT INTO user_cards (user_id, player_id, level)
SELECT DISTINCT gh.user_id, gh.player_id, 0
FROM gacha_history gh
JOIN players p ON gh.player_id = p.id
WHERE p.season = '19G2'
AND gh.user_id IN (SELECT user_id FROM affected_users)
AND NOT EXISTS (
  SELECT 1 FROM user_cards uc
  WHERE uc.user_id = gh.user_id
  AND uc.player_id = gh.player_id
);

-- Step 4: Option B - Compensation points (50,000 points per user)
-- UPDATE users
-- SET points = points + 50000
-- WHERE id IN (SELECT user_id FROM affected_users);

-- Step 5: Send in-game message (manual)
-- You'll need to manually notify affected users

-- Cleanup
DROP TEMPORARY TABLE affected_users;

-- Verify restoration
SELECT
  u.id,
  u.username,
  COUNT(*) as restored_19g2_cards
FROM user_cards uc
JOIN players p ON uc.player_id = p.id
JOIN users u ON uc.user_id = u.id
WHERE p.season = '19G2'
GROUP BY u.id, u.username
ORDER BY u.id;
