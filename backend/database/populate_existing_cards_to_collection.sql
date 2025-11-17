-- 기존에 보유한 카드들을 도감에 자동 등록
-- Insert all existing user cards into user_collected_cards

INSERT INTO user_collected_cards (user_id, player_id, first_obtained_at, total_obtained)
SELECT
  uc.user_id,
  uc.player_id,
  MIN(uc.obtained_at) as first_obtained_at,
  COUNT(*) as total_obtained
FROM user_cards uc
GROUP BY uc.user_id, uc.player_id
ON DUPLICATE KEY UPDATE
  total_obtained = VALUES(total_obtained),
  first_obtained_at = LEAST(first_obtained_at, VALUES(first_obtained_at));

-- Update user_collection_progress with correct counts
INSERT INTO user_collection_progress (user_id, total_cards_collected, last_updated)
SELECT
  user_id,
  COUNT(DISTINCT player_id) as total_cards_collected,
  NOW() as last_updated
FROM user_cards
GROUP BY user_id
ON DUPLICATE KEY UPDATE
  total_cards_collected = VALUES(total_cards_collected),
  last_updated = NOW();
