-- VS 모드 난이도 하향 조정 (일반 모드)

-- Stage 1: 강화 0 유지
UPDATE vs_stage_enemies SET enhancement_level = 0 WHERE stage_id = 1;

-- Stage 2: 강화 0으로 하향
UPDATE vs_stage_enemies SET enhancement_level = 0 WHERE stage_id = 2;

-- Stage 3 (중간보스): 강화 1로 하향
UPDATE vs_stage_enemies SET enhancement_level = 1 WHERE stage_id = 3;

-- Stage 4: 강화 1로 하향
UPDATE vs_stage_enemies SET enhancement_level = 1 WHERE stage_id = 4;

-- Stage 5: 강화 2로 하향
UPDATE vs_stage_enemies SET enhancement_level = 2 WHERE stage_id = 5;

-- Stage 6 (중간보스): 강화 3으로 하향
UPDATE vs_stage_enemies SET enhancement_level = 3 WHERE stage_id = 6;

-- Stage 7 (중간보스): 강화 3으로 하향
UPDATE vs_stage_enemies SET enhancement_level = 3 WHERE stage_id = 7;

-- Stage 8: 강화 4로 하향
UPDATE vs_stage_enemies SET enhancement_level = 4 WHERE stage_id = 8;

-- Stage 9: 강화 5로 하향
UPDATE vs_stage_enemies SET enhancement_level = 5 WHERE stage_id = 9;

-- Stage 10 (최종보스): 강화 6으로 하향
UPDATE vs_stage_enemies SET enhancement_level = 6 WHERE stage_id = 10;
