-- VS 모드 적 팀 구성 수정

-- Stage 7: KDF 팀으로 변경
DELETE e FROM vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
WHERE s.stage_number = 7;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT s.id, 'PerfecT', 2, 3, 1 FROM vs_stages s WHERE s.stage_number = 7
UNION ALL
SELECT s.id, 'Cuzz', 2, 3, 2 FROM vs_stages s WHERE s.stage_number = 7
UNION ALL
SELECT s.id, 'Bdd', 2, 3, 3 FROM vs_stages s WHERE s.stage_number = 7
UNION ALL
SELECT s.id, 'deokdam', 2, 3, 4 FROM vs_stages s WHERE s.stage_number = 7
UNION ALL
SELECT s.id, 'Peter', 2, 3, 5 FROM vs_stages s WHERE s.stage_number = 7;

-- Stage 8: HLE 팀으로 변경 (Peanut 포함)
DELETE e FROM vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
WHERE s.stage_number = 8;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT s.id, 'Doran', 2, 3, 1 FROM vs_stages s WHERE s.stage_number = 8
UNION ALL
SELECT s.id, 'Peanut', 2, 3, 2 FROM vs_stages s WHERE s.stage_number = 8
UNION ALL
SELECT s.id, 'zeka', 2, 3, 3 FROM vs_stages s WHERE s.stage_number = 8
UNION ALL
SELECT s.id, 'Viper', 2, 3, 4 FROM vs_stages s WHERE s.stage_number = 8
UNION ALL
SELECT s.id, 'Delight', 2, 3, 5 FROM vs_stages s WHERE s.stage_number = 8;

-- Stage 9: T1 팀 (이미 맞음, 강화만 확인)
UPDATE vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
SET e.enhancement_level = 3, e.hard_enhancement_level = 4
WHERE s.stage_number = 9;

-- Stage 10: Gen.G 올스타 팀으로 변경
DELETE e FROM vs_stage_enemies e
JOIN vs_stages s ON e.stage_id = s.id
WHERE s.stage_number = 10;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT s.id, 'Kiin', 3, 4, 1 FROM vs_stages s WHERE s.stage_number = 10
UNION ALL
SELECT s.id, 'Canyon', 3, 4, 2 FROM vs_stages s WHERE s.stage_number = 10
UNION ALL
SELECT s.id, 'Chovy', 3, 4, 3 FROM vs_stages s WHERE s.stage_number = 10
UNION ALL
SELECT s.id, 'Ruler', 3, 4, 4 FROM vs_stages s WHERE s.stage_number = 10
UNION ALL
SELECT s.id, 'Duro', 3, 4, 5 FROM vs_stages s WHERE s.stage_number = 10;
