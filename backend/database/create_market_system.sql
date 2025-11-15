-- 선수별 시장 가격 테이블
CREATE TABLE IF NOT EXISTS player_market_prices (
  player_id INT PRIMARY KEY,
  base_price INT NOT NULL,           -- 기본 가격 (티어별 기준)
  current_price INT NOT NULL,        -- 현재 시세
  price_floor INT NOT NULL,          -- 하한가 (base_price - 100)
  price_ceiling INT NOT NULL,        -- 상한가 (base_price + 100)
  total_volume INT DEFAULT 0,        -- 총 거래량
  last_traded_price INT,             -- 마지막 거래가
  last_traded_at TIMESTAMP,          -- 마지막 거래 시간
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- 시장 거래 내역 테이블
CREATE TABLE IF NOT EXISTS market_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  player_id INT NOT NULL,
  seller_id INT NOT NULL,
  buyer_id INT,                      -- NULL = 아직 판매되지 않음
  card_id INT NOT NULL,              -- 거래되는 카드 ID
  listing_price INT NOT NULL,        -- 등록 가격
  sold_price INT,                    -- 실제 판매가 (판매되면 기록)
  status ENUM('LISTED', 'SOLD', 'CANCELLED') DEFAULT 'LISTED',
  listed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sold_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES user_cards(id) ON DELETE CASCADE
);

-- 가격 변동 히스토리 테이블
CREATE TABLE IF NOT EXISTS price_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  player_id INT NOT NULL,
  price INT NOT NULL,
  transaction_id INT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES market_transactions(id) ON DELETE SET NULL
);

-- 모든 선수에 대해 기본 가격 설정
INSERT INTO player_market_prices (player_id, base_price, current_price, price_floor, price_ceiling)
SELECT
  id,
  CASE
    WHEN tier = 'COMMON' THEN 300
    WHEN tier = 'RARE' THEN 500
    WHEN tier = 'EPIC' THEN 1000
    WHEN tier = 'LEGENDARY' THEN 2000
    ELSE 300
  END as base_price,
  CASE
    WHEN tier = 'COMMON' THEN 300
    WHEN tier = 'RARE' THEN 500
    WHEN tier = 'EPIC' THEN 1000
    WHEN tier = 'LEGENDARY' THEN 2000
    ELSE 300
  END as current_price,
  CASE
    WHEN tier = 'COMMON' THEN 200
    WHEN tier = 'RARE' THEN 400
    WHEN tier = 'EPIC' THEN 900
    WHEN tier = 'LEGENDARY' THEN 1900
    ELSE 200
  END as price_floor,
  CASE
    WHEN tier = 'COMMON' THEN 400
    WHEN tier = 'RARE' THEN 600
    WHEN tier = 'EPIC' THEN 1100
    WHEN tier = 'LEGENDARY' THEN 2100
    ELSE 400
  END as price_ceiling
FROM players
WHERE id NOT IN (SELECT player_id FROM player_market_prices);

-- 인덱스 생성
CREATE INDEX idx_market_transactions_status ON market_transactions(status);
CREATE INDEX idx_market_transactions_player ON market_transactions(player_id);
CREATE INDEX idx_market_transactions_seller ON market_transactions(seller_id);
CREATE INDEX idx_price_history_player ON price_history(player_id);
