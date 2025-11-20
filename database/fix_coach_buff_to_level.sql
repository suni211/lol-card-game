-- 코치 버프를 강화 레벨과 동일하게 설정
-- 10강 = +10, 5강 = +5, 0강 = 0

-- 유저 코치 current_buff_value = enhancement_level로 설정
UPDATE user_coaches
SET current_buff_value = COALESCE(enhancement_level, 0);

-- 결과 확인
SELECT
  uc.id,
  c.name,
  c.star_rating,
  uc.enhancement_level,
  uc.current_buff_value
FROM user_coaches uc
JOIN coaches c ON uc.coach_id = c.id
WHERE uc.enhancement_level > 0
ORDER BY uc.enhancement_level DESC;
