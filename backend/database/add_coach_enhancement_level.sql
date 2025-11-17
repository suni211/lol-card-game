-- 코치 강화 레벨 추가
ALTER TABLE user_coaches
ADD COLUMN enhancement_level INT DEFAULT 0 COMMENT '강화 레벨 (최대 10)';

-- 코치 테이블에 현재 버프 값을 각 유저별로 저장하기 위해 user_coaches에 추가
ALTER TABLE user_coaches
ADD COLUMN current_buff_value INT DEFAULT NULL COMMENT '현재 강화된 버프 값 (NULL이면 기본값 사용)';
