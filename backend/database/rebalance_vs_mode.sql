-- VS 모드 완전 재밸런스 - 실제 전투 반영
-- 목표: 일반모드 300~450, 하드모드 400~600

-- Stage 1: 초보 팀 (DRX Challengers급)
-- 일반: 강화 0 (평균 OVR 70, 총 350)
-- 하드: 강화 1 (평균 OVR 70+1, 총 355)
UPDATE vs_stage_enemies SET enhancement_level = 0, hard_enhancement_level = 1 WHERE stage_id = 1;

-- Stage 2: 하위 LCK팀 (NS, BRO급)
-- 일반: 강화 0 (평균 OVR 75, 총 375)
-- 하드: 강화 1 (평균 OVR 75+1, 총 380)
UPDATE vs_stage_enemies SET enhancement_level = 0, hard_enhancement_level = 1 WHERE stage_id = 2;

-- Stage 3: 중간보스 - 중위권 팀 (DK급)
-- 일반: 강화 1 (평균 OVR 80, 총 405)
-- 하드: 강화 2 (평균 OVR 80+2, 총 410)
UPDATE vs_stage_enemies SET enhancement_level = 1, hard_enhancement_level = 2 WHERE stage_id = 3;

-- Stage 4: 중상위팀 (KT급)
-- 일반: 강화 1 (평균 OVR 84, 총 425)
-- 하드: 강화 2 (평균 OVR 84+2, 총 430)
UPDATE vs_stage_enemies SET enhancement_level = 1, hard_enhancement_level = 2 WHERE stage_id = 4;

-- Stage 5: 상위팀 (DK 풀파워급)
-- 일반: 강화 1 (평균 OVR 85, 총 430)
-- 하드: 강화 2 (평균 OVR 85+2, 총 435)
UPDATE vs_stage_enemies SET enhancement_level = 1, hard_enhancement_level = 2 WHERE stage_id = 5;

-- Stage 6: 중간보스 - 플레이오프팀 (FearX급)
-- 일반: 강화 2 (평균 OVR 85, 총 435)
-- 하드: 강화 3 (평균 OVR 85+3, 총 440)
UPDATE vs_stage_enemies SET enhancement_level = 2, hard_enhancement_level = 3 WHERE stage_id = 6;

-- Stage 7: 중간보스 - 준우승팀 (KDF급)
-- 일반: 강화 2 (평균 OVR 88, 총 440)
-- 하드: 강화 3 (평균 OVR 88+3, 총 455)
UPDATE vs_stage_enemies SET enhancement_level = 2, hard_enhancement_level = 3 WHERE stage_id = 7;

-- Stage 8: 우승후보 (HLE급)
-- 일반: 강화 2 (평균 OVR 92, 총 455)
-- 하드: 강화 3 (평균 OVR 92+3, 총 475)
UPDATE vs_stage_enemies SET enhancement_level = 2, hard_enhancement_level = 3 WHERE stage_id = 8;

-- Stage 9: 최강팀 (T1급)
-- 일반: 강화 3 (평균 OVR 100, 총 515)
-- 하드: 강화 4 (평균 OVR 100+4, 총 520)
UPDATE vs_stage_enemies SET enhancement_level = 3, hard_enhancement_level = 4 WHERE stage_id = 9;

-- Stage 10: 최종보스 - 올스타팀 (Gen.G급)
-- 일반: 강화 3 (평균 OVR 105, 총 540)
-- 하드: 강화 4 (평균 OVR 105+4, 총 545)
UPDATE vs_stage_enemies SET enhancement_level = 3, hard_enhancement_level = 4 WHERE stage_id = 10;
