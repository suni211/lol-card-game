-- VS 모드 완전 초기화 및 재생성

-- 1. 기존 데이터 삭제
DELETE FROM vs_stage_enemies;
DELETE FROM vs_stages;
DELETE FROM user_vs_progress;

-- 2. VS 스테이지 생성
INSERT INTO vs_stages (stage_number, stage_name, is_boss, reward_points) VALUES
(1, '1단계 - 신인 도전', FALSE, 100),
(2, '2단계 - 성장하는 선수들', FALSE, 200),
(3, '3단계 - 중간보스', TRUE, 1000),
(4, '4단계 - 강력한 상대', FALSE, 500),
(5, '5단계 - 스타 플레이어', FALSE, 3000),
(6, '6단계 - 중간보스', TRUE, 5000),
(7, '7단계 - 중간보스', TRUE, 10000),
(8, '8단계 - 챔피언들', FALSE, 5000),
(9, '9단계 - T1 왕조', FALSE, 10000),
(10, '10단계 - 최종보스', TRUE, 50000);

-- 3. 적 팀 구성 (밸런스 적용)
-- Stage 1: DRX Challengers (강화 0/1)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'DuDu', 0, 1, 1 FROM vs_stages WHERE stage_number = 1
UNION ALL SELECT id, 'Pyosik', 0, 1, 2 FROM vs_stages WHERE stage_number = 1
UNION ALL SELECT id, 'BuLLDoG', 0, 1, 3 FROM vs_stages WHERE stage_number = 1
UNION ALL SELECT id, 'Berserker', 0, 1, 4 FROM vs_stages WHERE stage_number = 1
UNION ALL SELECT id, 'Life', 0, 1, 5 FROM vs_stages WHERE stage_number = 1;

-- Stage 2: NS Red Force (강화 0/1)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Rich', 0, 1, 1 FROM vs_stages WHERE stage_number = 2
UNION ALL SELECT id, 'Sponge', 0, 1, 2 FROM vs_stages WHERE stage_number = 2
UNION ALL SELECT id, 'Kyeahoo', 0, 1, 3 FROM vs_stages WHERE stage_number = 2
UNION ALL SELECT id, 'Teddy', 0, 1, 4 FROM vs_stages WHERE stage_number = 2
UNION ALL SELECT id, 'Andil', 0, 1, 5 FROM vs_stages WHERE stage_number = 2;

-- Stage 3: Gen.G 2024 (강화 1/2)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Morgan', 1, 2, 1 FROM vs_stages WHERE stage_number = 3
UNION ALL SELECT id, 'Croco', 1, 2, 2 FROM vs_stages WHERE stage_number = 3
UNION ALL SELECT id, 'Clozer', 1, 2, 3 FROM vs_stages WHERE stage_number = 3
UNION ALL SELECT id, 'Hype', 1, 2, 4 FROM vs_stages WHERE stage_number = 3
UNION ALL SELECT id, 'Pollu', 1, 2, 5 FROM vs_stages WHERE stage_number = 3;

-- Stage 4: KT Rolster (강화 1/2)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kingen', 1, 2, 1 FROM vs_stages WHERE stage_number = 4
UNION ALL SELECT id, 'GIDEON', 1, 2, 2 FROM vs_stages WHERE stage_number = 4
UNION ALL SELECT id, 'Calix', 1, 2, 3 FROM vs_stages WHERE stage_number = 4
UNION ALL SELECT id, 'Jiwoo', 1, 2, 4 FROM vs_stages WHERE stage_number = 4
UNION ALL SELECT id, 'Lehends', 1, 2, 5 FROM vs_stages WHERE stage_number = 4;

-- Stage 5: Dplus KIA (강화 1/2)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Siwoo', 1, 2, 1 FROM vs_stages WHERE stage_number = 5
UNION ALL SELECT id, 'Lucid', 1, 2, 2 FROM vs_stages WHERE stage_number = 5
UNION ALL SELECT id, 'ShowMaker', 1, 2, 3 FROM vs_stages WHERE stage_number = 5
UNION ALL SELECT id, 'Aiming', 1, 2, 4 FROM vs_stages WHERE stage_number = 5
UNION ALL SELECT id, 'BeryL', 1, 2, 5 FROM vs_stages WHERE stage_number = 5;

-- Stage 6: FearX (강화 2/3)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Clear', 2, 3, 1 FROM vs_stages WHERE stage_number = 6
UNION ALL SELECT id, 'Raptor', 2, 3, 2 FROM vs_stages WHERE stage_number = 6
UNION ALL SELECT id, 'VicLa', 2, 3, 3 FROM vs_stages WHERE stage_number = 6
UNION ALL SELECT id, 'Diable', 2, 3, 4 FROM vs_stages WHERE stage_number = 6
UNION ALL SELECT id, 'Kellin', 2, 3, 5 FROM vs_stages WHERE stage_number = 6;

-- Stage 7: Kwangdong Freecs (강화 2/3)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'PerfecT', 2, 3, 1 FROM vs_stages WHERE stage_number = 7
UNION ALL SELECT id, 'Cuzz', 2, 3, 2 FROM vs_stages WHERE stage_number = 7
UNION ALL SELECT id, 'Bdd', 2, 3, 3 FROM vs_stages WHERE stage_number = 7
UNION ALL SELECT id, 'deokdam', 2, 3, 4 FROM vs_stages WHERE stage_number = 7
UNION ALL SELECT id, 'Peter', 2, 3, 5 FROM vs_stages WHERE stage_number = 7;

-- Stage 8: Hanwha Life Esports (강화 2/3)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Doran', 2, 3, 1 FROM vs_stages WHERE stage_number = 8
UNION ALL SELECT id, 'Peanut', 2, 3, 2 FROM vs_stages WHERE stage_number = 8
UNION ALL SELECT id, 'zeka', 2, 3, 3 FROM vs_stages WHERE stage_number = 8
UNION ALL SELECT id, 'Viper', 2, 3, 4 FROM vs_stages WHERE stage_number = 8
UNION ALL SELECT id, 'Delight', 2, 3, 5 FROM vs_stages WHERE stage_number = 8;

-- Stage 9: T1 (강화 3/4)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 3, 4, 1 FROM vs_stages WHERE stage_number = 9
UNION ALL SELECT id, 'Oner', 3, 4, 2 FROM vs_stages WHERE stage_number = 9
UNION ALL SELECT id, 'Faker', 3, 4, 3 FROM vs_stages WHERE stage_number = 9
UNION ALL SELECT id, 'Gumayusi', 3, 4, 4 FROM vs_stages WHERE stage_number = 9
UNION ALL SELECT id, 'Keria', 3, 4, 5 FROM vs_stages WHERE stage_number = 9;

-- Stage 10: Gen.G All-Stars (강화 3/4)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 3, 4, 1 FROM vs_stages WHERE stage_number = 10
UNION ALL SELECT id, 'Canyon', 3, 4, 2 FROM vs_stages WHERE stage_number = 10
UNION ALL SELECT id, 'Chovy', 3, 4, 3 FROM vs_stages WHERE stage_number = 10
UNION ALL SELECT id, 'Ruler', 3, 4, 4 FROM vs_stages WHERE stage_number = 10
UNION ALL SELECT id, 'Duro', 3, 4, 5 FROM vs_stages WHERE stage_number = 10;
