-- 쿠폰 테이블에 최대 사용자 수 제한 컬럼 추가
ALTER TABLE coupons
ADD COLUMN max_users INT DEFAULT NULL COMMENT '최대 사용 가능한 유저 수 (NULL = 무제한)';

-- 현재 사용한 유니크 사용자 수를 계산하는 인덱스
CREATE INDEX idx_redemption_coupon_user ON coupon_redemptions(coupon_id, user_id);
