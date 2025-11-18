-- 레이드 시스템 초기화

-- 기존 데이터 삭제
DELETE FROM raid_participants;
DELETE FROM raid_bosses;

-- 확인
SELECT 'Raid system reset completed' as status;
SELECT COUNT(*) as raid_bosses_count FROM raid_bosses;
SELECT COUNT(*) as raid_participants_count FROM raid_participants;
