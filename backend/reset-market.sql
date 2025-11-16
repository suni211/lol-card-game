-- 이적시장 초기화 및 재설정

-- 1. 기존 이적시장 매물 모두 삭제
DELETE FROM market_transactions WHERE status = 'LISTED';

-- 2. 기존 시세 정보 삭제
DELETE FROM player_market_prices;

-- 3. 오버롤과 티어에 맞는 시세 정보 생성
-- 가격 공식 (기존 대비 절반으로 조정):
-- ICON: (overall * 100) ~ (overall * 150)
-- LEGENDARY: (overall * 50) ~ (overall * 75)
-- EPIC: (overall * 25) ~ (overall * 37)
-- RARE: (overall * 12) ~ (overall * 20)
-- COMMON: (overall * 5) ~ (overall * 10)

INSERT INTO player_market_prices (player_id, base_price, current_price, price_floor, price_ceiling)
SELECT
  id,
  CASE tier
    WHEN 'ICON' THEN overall * 125
    WHEN 'LEGENDARY' THEN overall * 62
    WHEN 'EPIC' THEN overall * 31
    WHEN 'RARE' THEN overall * 16
    WHEN 'COMMON' THEN overall * 7
  END AS base_price,
  CASE tier
    WHEN 'ICON' THEN overall * 125
    WHEN 'LEGENDARY' THEN overall * 62
    WHEN 'EPIC' THEN overall * 31
    WHEN 'RARE' THEN overall * 16
    WHEN 'COMMON' THEN overall * 7
  END AS current_price,
  CASE tier
    WHEN 'ICON' THEN overall * 100
    WHEN 'LEGENDARY' THEN overall * 50
    WHEN 'EPIC' THEN overall * 25
    WHEN 'RARE' THEN overall * 12
    WHEN 'COMMON' THEN overall * 5
  END AS price_floor,
  CASE tier
    WHEN 'ICON' THEN overall * 150
    WHEN 'LEGENDARY' THEN overall * 75
    WHEN 'EPIC' THEN overall * 37
    WHEN 'RARE' THEN overall * 20
    WHEN 'COMMON' THEN overall * 10
  END AS price_ceiling
FROM players;

-- 4. 가격 히스토리 테이블 정리 (선택사항)
TRUNCATE TABLE price_history;
