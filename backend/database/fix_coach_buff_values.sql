-- 코치 버프 값 재조정
-- 기존 값이 너무 크므로 낮게 조정 (1~6 범위)

-- 5성 코치
UPDATE coaches SET buff_value = 3, description = '전체 선수 오버롤 +3' WHERE name = '김철수'; -- OVERALL +3
UPDATE coaches SET buff_value = 4, description = 'T1 팀 선수 오버롤 +4' WHERE name = '이영희'; -- TEAM T1 +4
UPDATE coaches SET buff_value = 6, description = '전략 승률 +6%' WHERE name = '박민수'; -- STRATEGY +6%

-- 4성 코치
UPDATE coaches SET buff_value = 2, description = '전체 선수 오버롤 +2' WHERE name = '최동욱'; -- OVERALL +2
UPDATE coaches SET buff_value = 3, description = '미드 선수 오버롤 +3' WHERE name = '정수진'; -- POSITION MID +3
UPDATE coaches SET buff_value = 3, description = 'ADC 선수 오버롤 +3' WHERE name = '강태양'; -- POSITION ADC +3
UPDATE coaches SET buff_value = 3, description = 'DK 팀 선수 오버롤 +3' WHERE name = '송지훈'; -- TEAM DK +3
UPDATE coaches SET buff_value = 3, description = '정글 선수 오버롤 +3' WHERE name = '윤서연'; -- POSITION JUNGLE +3
UPDATE coaches SET buff_value = 3, description = 'GEN 팀 선수 오버롤 +3' WHERE name = '한민재'; -- TEAM GEN +3
UPDATE coaches SET buff_value = 4, description = '전략 승률 +4%' WHERE name = '오상민'; -- STRATEGY +4%

-- 3성 코치
UPDATE coaches SET buff_value = 2, description = '전체 선수 오버롤 +2' WHERE name = '배준호'; -- OVERALL +2
UPDATE coaches SET buff_value = 2, description = '탑 선수 오버롤 +2' WHERE name = '임지우'; -- POSITION TOP +2
UPDATE coaches SET buff_value = 2, description = '서포터 선수 오버롤 +2' WHERE name = '서하늘'; -- POSITION SUPPORT +2
UPDATE coaches SET buff_value = 2, description = 'HLE 팀 선수 오버롤 +2' WHERE name = '노현우'; -- TEAM HLE +2
UPDATE coaches SET buff_value = 2, description = '미드 선수 오버롤 +2' WHERE name = '황다은'; -- POSITION MID +2
UPDATE coaches SET buff_value = 2, description = 'KT 팀 선수 오버롤 +2' WHERE name = '안재민'; -- TEAM KT +2
UPDATE coaches SET buff_value = 2, description = 'ADC 선수 오버롤 +2' WHERE name = '문소희'; -- POSITION ADC +2
UPDATE coaches SET buff_value = 2, description = 'LSB 팀 선수 오버롤 +2' WHERE name = '신동혁'; -- TEAM LSB +2
UPDATE coaches SET buff_value = 3, description = '전략 승률 +3%' WHERE name = '류지성'; -- STRATEGY +3%
UPDATE coaches SET buff_value = 2, description = '정글 선수 오버롤 +2' WHERE name = '곽은비'; -- POSITION JUNGLE +2

-- 2성 코치
UPDATE coaches SET buff_value = 1, description = '전체 선수 오버롤 +1' WHERE name = '진수아'; -- OVERALL +1
UPDATE coaches SET buff_value = 2, description = '탑 선수 오버롤 +2' WHERE name = '허준영'; -- POSITION TOP +2
UPDATE coaches SET buff_value = 2, description = '미드 선수 오버롤 +2' WHERE name = '남궁민'; -- POSITION MID +2
UPDATE coaches SET buff_value = 2, description = 'NS 팀 선수 오버롤 +2' WHERE name = '전하린'; -- TEAM NS +2
UPDATE coaches SET buff_value = 2, description = '서포터 선수 오버롤 +2' WHERE name = '표정우'; -- POSITION SUPPORT +2
UPDATE coaches SET buff_value = 2, description = '전략 승률 +2%' WHERE name = '권나영'; -- STRATEGY +2%
UPDATE coaches SET buff_value = 2, description = 'ADC 선수 오버롤 +2' WHERE name = '홍석진'; -- POSITION ADC +2

-- 1성 코치
UPDATE coaches SET buff_value = 1, description = '전체 선수 오버롤 +1' WHERE name = '구민호'; -- OVERALL +1
UPDATE coaches SET buff_value = 1, description = '정글 선수 오버롤 +1' WHERE name = '설아름'; -- POSITION JUNGLE +1
UPDATE coaches SET buff_value = 1, description = '전략 승률 +1%' WHERE name = '탁준서'; -- STRATEGY +1%

-- user_coaches에 이미 강화된 코치가 있다면 current_buff_value도 조정
UPDATE user_coaches uc
JOIN coaches c ON uc.coach_id = c.id
SET uc.current_buff_value = c.buff_value
WHERE uc.current_buff_value IS NULL OR uc.current_buff_value = 0;

-- 확인
SELECT id, name, star_rating, buff_type, buff_value, buff_target, description
FROM coaches
ORDER BY star_rating DESC, name;
