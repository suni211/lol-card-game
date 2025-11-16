-- players 테이블에 특성 컬럼 추가
ALTER TABLE players
ADD COLUMN trait1 VARCHAR(50) DEFAULT NULL,
ADD COLUMN trait2 VARCHAR(50) DEFAULT NULL,
ADD COLUMN trait3 VARCHAR(50) DEFAULT NULL;

-- 인덱스 추가 (검색 최적화)
CREATE INDEX idx_trait1 ON players(trait1);
CREATE INDEX idx_trait2 ON players(trait2);
CREATE INDEX idx_trait3 ON players(trait3);

-- 확인
DESCRIBE players;
