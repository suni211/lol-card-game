-- VS 모드 난이도 수정 (stage_number 기준)
-- stage_id가 아닌 vs_stages의 stage_number를 참조하여 업데이트

-- Stage 1: 초보 팀
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.enhancement_level = 0, e.hard_enhancement_level = 1
WHERE s.stage_number = 1;

-- Stage 2: 하위 LCK팀
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.enhancement_level = 0, e.hard_enhancement_level = 1
WHERE s.stage_number = 2;

-- Stage 3: 중간보스 - 중위권 팀
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.enhancement_level = 1, e.hard_enhancement_level = 2
WHERE s.stage_number = 3;

-- Stage 4: 중상위팀
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.enhancement_level = 1, e.hard_enhancement_level = 2
WHERE s.stage_number = 4;

-- Stage 5: 상위팀
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.enhancement_level = 1, e.hard_enhancement_level = 2
WHERE s.stage_number = 5;

-- Stage 6: 중간보스 - 플레이오프팀
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.enhancement_level = 2, e.hard_enhancement_level = 3
WHERE s.stage_number = 6;

-- Stage 7: 중간보스 - 준우승팀
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.enhancement_level = 2, e.hard_enhancement_level = 3
WHERE s.stage_number = 7;

-- Stage 8: 우승후보
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.enhancement_level = 2, e.hard_enhancement_level = 3
WHERE s.stage_number = 8;

-- Stage 9: 최강팀
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.enhancement_level = 3, e.hard_enhancement_level = 4
WHERE s.stage_number = 9;

-- Stage 10: 최종보스
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.enhancement_level = 3, e.hard_enhancement_level = 4
WHERE s.stage_number = 10;
