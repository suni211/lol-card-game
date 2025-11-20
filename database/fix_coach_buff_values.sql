-- Fix coach buff values (현재 값이 너무 높음)
-- 기본 버프값을 1~6 범위로 조정 (별 등급에 따라)
-- 10강 시 최대 버프: 기본값 + 10 = 11~16

-- 1. 현재 코치 버프값 확인
SELECT id, name, star_rating, buff_type, buff_value, buff_target FROM coaches;

-- 2. 코치 기본 버프값 조정 (별 등급 기반)
-- 1성: 1, 2성: 2, 3성: 3, 4성: 4, 5성: 5-6
UPDATE coaches SET buff_value =
  CASE
    WHEN star_rating = 1 THEN 1
    WHEN star_rating = 2 THEN 2
    WHEN star_rating = 3 THEN 3
    WHEN star_rating = 4 THEN 4
    WHEN star_rating = 5 THEN 6
    ELSE 1
  END;

-- 3. 유저 코치 current_buff_value 재계산
-- current_buff_value = 새로운 기본값 + (강화레벨 * 1)
UPDATE user_coaches uc
JOIN coaches c ON uc.coach_id = c.id
SET uc.current_buff_value = c.buff_value + COALESCE(uc.enhancement_level, 0);

-- 4. 결과 확인
SELECT
  uc.id,
  c.name,
  c.star_rating,
  c.buff_value as base_buff,
  uc.enhancement_level,
  uc.current_buff_value,
  (c.buff_value + COALESCE(uc.enhancement_level, 0)) as expected_buff
FROM user_coaches uc
JOIN coaches c ON uc.coach_id = c.id
ORDER BY uc.user_id, c.name;

-- 최동욱 코치 확인
SELECT * FROM coaches WHERE name LIKE '%최동욱%';
