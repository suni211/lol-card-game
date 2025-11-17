-- 기존 UNIQUE KEY 제거 및 새로운 INDEX 추가
-- 같은 유저가 같은 길드에 PENDING 상태의 요청을 여러 개 가질 수 없도록
-- 하지만 ACCEPTED/REJECTED된 후에는 다시 신청 가능하도록 수정

ALTER TABLE guild_join_requests
DROP INDEX unique_guild_user_request;

-- PENDING 상태인 요청만 UNIQUE하게
-- MySQL에서는 조건부 UNIQUE INDEX를 지원하지 않으므로 애플리케이션 레벨에서 처리
-- 대신 복합 인덱스 추가
ALTER TABLE guild_join_requests
ADD INDEX idx_guild_user_status (guild_id, user_id, status);
