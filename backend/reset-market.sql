-- 이적시장 초기화 및 재설정

-- 1. 기존 이적시장 매물 모두 삭제
DELETE FROM market_transactions WHERE status = 'LISTED';

-- 2. 기존 시세 정보 삭제
DELETE FROM player_market_prices;

-- 3. 오버롤과 티어에 맞는 시세 정보 생성
-- 가격 공식:
-- ICON: (overall * 200) ~ (overall * 300)
-- LEGENDARY: (overall * 100) ~ (overall * 150)
-- EPIC: (overall * 50) ~ (overall * 75)
-- RARE: (overall * 25) ~ (overall * 40)
-- COMMON: (overall * 10) ~ (overall * 20)

INSERT INTO player_market_prices (player_id, base_price, current_price, price_floor, price_ceiling)
SELECT
  id,
  CASE tier
    WHEN 'ICON' THEN overall * 250
    WHEN 'LEGENDARY' THEN overall * 125
    WHEN 'EPIC' THEN overall * 62
    WHEN 'RARE' THEN overall * 32
    WHEN 'COMMON' THEN overall * 15
  END AS base_price,
  CASE tier
    WHEN 'ICON' THEN overall * 250
    WHEN 'LEGENDARY' THEN overall * 125
    WHEN 'EPIC' THEN overall * 62
    WHEN 'RARE' THEN overall * 32
    WHEN 'COMMON' THEN overall * 15
  END AS current_price,
  CASE tier
    WHEN 'ICON' THEN overall * 200
    WHEN 'LEGENDARY' THEN overall * 100
    WHEN 'EPIC' THEN overall * 50
    WHEN 'RARE' THEN overall * 25
    WHEN 'COMMON' THEN overall * 10
  END AS price_floor,
  CASE tier
    WHEN 'ICON' THEN overall * 300
    WHEN 'LEGENDARY' THEN overall * 150
    WHEN 'EPIC' THEN overall * 75
    WHEN 'RARE' THEN overall * 40
    WHEN 'COMMON' THEN overall * 20
  END AS price_ceiling
FROM players;

-- 4. 가격 히스토리 테이블 정리 (선택사항)
TRUNCATE TABLE price_history;
