-- 다중 계정 정지 관련 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at DATETIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS multi_account_ban_until DATETIME;

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_last_login_ip ON users(last_login_ip);
CREATE INDEX IF NOT EXISTS idx_multi_account_ban ON users(multi_account_ban_until);
