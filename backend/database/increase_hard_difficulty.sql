-- 하드 모드 난이도 상향 조정

-- Stage 1: 하드 5강
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.hard_enhancement_level = 5
WHERE s.stage_number = 1;

-- Stage 2: 하드 5강
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.hard_enhancement_level = 5
WHERE s.stage_number = 2;

-- Stage 3: 하드 6강
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.hard_enhancement_level = 6
WHERE s.stage_number = 3;

-- Stage 4: 하드 6강
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.hard_enhancement_level = 6
WHERE s.stage_number = 4;

-- Stage 5: 하드 7강
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.hard_enhancement_level = 7
WHERE s.stage_number = 5;

-- Stage 6: 하드 7강
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.hard_enhancement_level = 7
WHERE s.stage_number = 6;

-- Stage 7: 하드 8강
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.hard_enhancement_level = 8
WHERE s.stage_number = 7;

-- Stage 8: 하드 8강
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.hard_enhancement_level = 8
WHERE s.stage_number = 8;

-- Stage 9: 하드 9강
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.hard_enhancement_level = 9
WHERE s.stage_number = 9;

-- Stage 10: 하드 10강
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.hard_enhancement_level = 10
WHERE s.stage_number = 10;
