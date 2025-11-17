-- 중복된 이벤트 퀘스트 삭제
-- ID가 가장 낮은 퀘스트만 남기고 나머지는 삭제

-- 임시 테이블 생성하여 각 퀘스트 타입의 최소 ID 저장
CREATE TEMPORARY TABLE temp_min_ids AS
SELECT MIN(id) as min_id, quest_type
FROM event_quests
GROUP BY quest_type;

-- 최소 ID가 아닌 중복 퀘스트 삭제
DELETE FROM event_quests
WHERE id NOT IN (SELECT min_id FROM temp_min_ids);

-- 임시 테이블 삭제
DROP TEMPORARY TABLE temp_min_ids;

-- 결과 확인
SELECT * FROM event_quests ORDER BY id;
