-- 코치 시스템 전면 개편
-- 버프 공식: 기본버프 (별등급 기반) + 강화레벨
-- 1성: 0 + 강화레벨
-- 2성: 1 + 강화레벨
-- 3성: 2 + 강화레벨
-- 4성: 3 + 강화레벨
-- 5성: 5 + 강화레벨

-- 예시: 5성 코치 +10강화 = 5 + 10 = 15
--       4성 코치 +10강화 = 3 + 10 = 13
--       3성 코치 +10강화 = 2 + 10 = 12

-- 1. 코치 테이블의 buff_value를 기본 버프로 업데이트
UPDATE coaches SET buff_value =
  CASE star_rating
    WHEN 1 THEN 0
    WHEN 2 THEN 1
    WHEN 3 THEN 2
    WHEN 4 THEN 3
    WHEN 5 THEN 5
    ELSE 0
  END;

-- 2. 유저 코치 current_buff_value 재계산 (기본버프 + 강화레벨)
UPDATE user_coaches uc
JOIN coaches c ON uc.coach_id = c.id
SET uc.current_buff_value = c.buff_value + COALESCE(uc.enhancement_level, 0);

-- 3. 결과 확인
SELECT
  c.name,
  c.star_rating,
  c.buff_value as base_buff,
  uc.enhancement_level,
  uc.current_buff_value,
  (c.buff_value + COALESCE(uc.enhancement_level, 0)) as expected
FROM user_coaches uc
JOIN coaches c ON uc.coach_id = c.id
WHERE uc.enhancement_level > 0
ORDER BY c.star_rating DESC, uc.enhancement_level DESC;

-- 4. 코치 테이블 확인
SELECT id, name, star_rating, buff_type, buff_value, buff_target
FROM coaches
ORDER BY star_rating DESC, name;
