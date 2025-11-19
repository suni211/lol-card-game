-- 코치 버프 값 재조정
-- 기존 값이 너무 크거나 0인 경우 수정

-- 5성 코치
UPDATE coaches SET buff_value = 5 WHERE name = '김철수'; -- OVERALL +5
UPDATE coaches SET buff_value = 6 WHERE name = '이영희'; -- TEAM T1 +6
UPDATE coaches SET buff_value = 8 WHERE name = '박민수'; -- STRATEGY +8%

-- 4성 코치
UPDATE coaches SET buff_value = 4 WHERE name = '최동욱'; -- OVERALL +4
UPDATE coaches SET buff_value = 5 WHERE name = '정수진'; -- POSITION MID +5
UPDATE coaches SET buff_value = 5 WHERE name = '강태양'; -- POSITION ADC +5
UPDATE coaches SET buff_value = 5 WHERE name = '송지훈'; -- TEAM DK +5
UPDATE coaches SET buff_value = 5 WHERE name = '윤서연'; -- POSITION JUNGLE +5
UPDATE coaches SET buff_value = 5 WHERE name = '한민재'; -- TEAM GEN +5
UPDATE coaches SET buff_value = 6 WHERE name = '오상민'; -- STRATEGY +6%

-- 3성 코치
UPDATE coaches SET buff_value = 3 WHERE name = '배준호'; -- OVERALL +3
UPDATE coaches SET buff_value = 4 WHERE name = '임지우'; -- POSITION TOP +4
UPDATE coaches SET buff_value = 4 WHERE name = '서하늘'; -- POSITION SUPPORT +4
UPDATE coaches SET buff_value = 4 WHERE name = '노현우'; -- TEAM HLE +4
UPDATE coaches SET buff_value = 4 WHERE name = '황다은'; -- POSITION MID +4
UPDATE coaches SET buff_value = 4 WHERE name = '안재민'; -- TEAM KT +4
UPDATE coaches SET buff_value = 4 WHERE name = '문소희'; -- POSITION ADC +4
UPDATE coaches SET buff_value = 4 WHERE name = '신동혁'; -- TEAM LSB +4
UPDATE coaches SET buff_value = 5 WHERE name = '류지성'; -- STRATEGY +5%
UPDATE coaches SET buff_value = 4 WHERE name = '곽은비'; -- POSITION JUNGLE +4

-- 2성 코치
UPDATE coaches SET buff_value = 2 WHERE name = '진수아'; -- OVERALL +2
UPDATE coaches SET buff_value = 3 WHERE name = '허준영'; -- POSITION TOP +3
UPDATE coaches SET buff_value = 3 WHERE name = '남궁민'; -- POSITION MID +3
UPDATE coaches SET buff_value = 3 WHERE name = '전하린'; -- TEAM NS +3
UPDATE coaches SET buff_value = 3 WHERE name = '표정우'; -- POSITION SUPPORT +3
UPDATE coaches SET buff_value = 4 WHERE name = '권나영'; -- STRATEGY +4%
UPDATE coaches SET buff_value = 3 WHERE name = '홍석진'; -- POSITION ADC +3

-- 1성 코치
UPDATE coaches SET buff_value = 1 WHERE name = '구민호'; -- OVERALL +1
UPDATE coaches SET buff_value = 2 WHERE name = '설아름'; -- POSITION JUNGLE +2
UPDATE coaches SET buff_value = 2 WHERE name = '탁준서'; -- STRATEGY +2%

-- user_coaches에 이미 강화된 코치가 있다면 current_buff_value도 조정
UPDATE user_coaches uc
JOIN coaches c ON uc.coach_id = c.id
SET uc.current_buff_value = c.buff_value
WHERE uc.current_buff_value IS NULL OR uc.current_buff_value = 0;

-- 확인
SELECT id, name, star_rating, buff_type, buff_value, buff_target, description
FROM coaches
ORDER BY star_rating DESC, name;
