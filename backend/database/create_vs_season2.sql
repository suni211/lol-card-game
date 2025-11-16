-- VS 모드 시즌 2: 50단계 (난이도별 보상 체계)

-- 기존 데이터 삭제
DELETE FROM vs_stage_enemies;
DELETE FROM vs_stages;
DELETE FROM user_vs_progress;

-- 시즌 2 스테이지 생성 (50단계)
-- 하드모드: 보상 4배, 강화 레벨 대폭 증가
-- 1~11단계: 쉬움 - 300P (하드 1200P)
INSERT INTO vs_stages (stage_number, stage_name, is_boss, reward_points, hard_mode_multiplier) VALUES
(1, '1단계 - 신인 도전', FALSE, 300, 4),
(2, '2단계 - 루키 리그', FALSE, 300, 4),
(3, '3단계 - 성장하는 재능', FALSE, 300, 4),
(4, '4단계 - 도약의 시작', FALSE, 300, 4),
(5, '5단계 - 연습생 탈출', FALSE, 300, 4),
(6, '6단계 - 챌린저스 무대', FALSE, 300, 4),
(7, '7단계 - 첫 승리', FALSE, 300, 4),
(8, '8단계 - 팀워크 훈련', FALSE, 300, 4),
(9, '9단계 - 기본기 마스터', FALSE, 300, 4),
(10, '10단계 - 프로 입문', FALSE, 300, 4),
(11, '11단계 - 쉬움 완료', TRUE, 300, 4),

-- 12~22단계: 보통 - 1000P (하드 4000P)
(12, '12단계 - 프로 데뷔', FALSE, 1000, 4),
(13, '13단계 - 첫 정규리그', FALSE, 1000, 4),
(14, '14단계 - 중위권 팀', FALSE, 1000, 4),
(15, '15단계 - 스타팅 라인업', FALSE, 1000, 4),
(16, '16단계 - 팀 핵심', FALSE, 1000, 4),
(17, '17단계 - 플레이오프 진출', FALSE, 1000, 4),
(18, '18단계 - 전술 마스터', FALSE, 1000, 4),
(19, '19단계 - 강팀 도전', FALSE, 1000, 4),
(20, '20단계 - 시너지 각성', FALSE, 1000, 4),
(21, '21단계 - 명성 상승', FALSE, 1000, 4),
(22, '22단계 - 보통 완료', TRUE, 1000, 4),

-- 23~33단계: 어려움 - 2500P (하드 10000P)
(23, '23단계 - 강호 진입', FALSE, 2500, 4),
(24, '24단계 - 상위권 경쟁', FALSE, 2500, 4),
(25, '25단계 - 우승 후보', FALSE, 2500, 4),
(26, '26단계 - 리그 최강', FALSE, 2500, 4),
(27, '27단계 - 결승 진출', FALSE, 2500, 4),
(28, '28단계 - 챔피언 도전', FALSE, 2500, 4),
(29, '29단계 - 스타 플레이어', FALSE, 2500, 4),
(30, '30단계 - 에이스 등극', FALSE, 2500, 4),
(31, '31단계 - 전설의 시작', FALSE, 2500, 4),
(32, '32단계 - 국제 무대', FALSE, 2500, 4),
(33, '33단계 - 어려움 완료', TRUE, 2500, 4),

-- 34~49단계: 지옥 - 10000P (하드 40000P)
(34, '34단계 - 지옥문 입장', FALSE, 10000, 4),
(35, '35단계 - 세계 랭커', FALSE, 10000, 4),
(36, '36단계 - MSI 도전', FALSE, 10000, 4),
(37, '37단계 - 월드 챔피언십', FALSE, 10000, 4),
(38, '38단계 - 전설의 대결', FALSE, 10000, 4),
(39, '39단계 - 역대급 매치업', FALSE, 10000, 4),
(40, '40단계 - 신의 경지', FALSE, 10000, 4),
(41, '41단계 - 초월자', FALSE, 10000, 4),
(42, '42단계 - 불멸의 전설', FALSE, 10000, 4),
(43, '43단계 - 올타임 레전드', FALSE, 10000, 4),
(44, '44단계 - 역사를 쓰다', FALSE, 10000, 4),
(45, '45단계 - 시대의 지배자', FALSE, 10000, 4),
(46, '46단계 - 완벽한 게임', FALSE, 10000, 4),
(47, '47단계 - 신화 창조', FALSE, 10000, 4),
(48, '48단계 - 최종 관문', FALSE, 10000, 4),
(49, '49단계 - 지옥 완료', TRUE, 10000, 4),

-- 50단계: 최종 보스 - ICON 10강 - 30000P (하드 120000P)
(50, '50단계 - 궁극의 도전: ICON 10강', TRUE, 30000, 4);

-- ============================================
-- 적 팀 구성
-- ============================================

-- 1~11단계: 쉬움 (LCP/LTA 선수, 강화 0, 하드 3강)
-- Stage 1: LCP 신인팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Pun', 0, 3, 1 FROM vs_stages WHERE stage_number = 1
UNION ALL SELECT id, 'Hizto', 0, 3, 2 FROM vs_stages WHERE stage_number = 1
UNION ALL SELECT id, 'Dire', 0, 3, 3 FROM vs_stages WHERE stage_number = 1
UNION ALL SELECT id, 'Eddie', 0, 3, 4 FROM vs_stages WHERE stage_number = 1
UNION ALL SELECT id, 'Taki', 0, 3, 5 FROM vs_stages WHERE stage_number = 1;

-- Stage 2: LCP 혼성팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Azhi', 0, 3, 1 FROM vs_stages WHERE stage_number = 2
UNION ALL SELECT id, 'JunJia', 0, 3, 2 FROM vs_stages WHERE stage_number = 2
UNION ALL SELECT id, 'HongQ', 0, 3, 3 FROM vs_stages WHERE stage_number = 2
UNION ALL SELECT id, 'Betty', 0, 3, 4 FROM vs_stages WHERE stage_number = 2
UNION ALL SELECT id, 'Woody', 0, 3, 5 FROM vs_stages WHERE stage_number = 2;

-- Stage 3: LTA 혼성팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Jojo', 0, 3, 1 FROM vs_stages WHERE stage_number = 3
UNION ALL SELECT id, 'Bugi', 0, 3, 2 FROM vs_stages WHERE stage_number = 3
UNION ALL SELECT id, 'Evi', 0, 3, 3 FROM vs_stages WHERE stage_number = 3
UNION ALL SELECT id, 'Yutapon', 0, 3, 4 FROM vs_stages WHERE stage_number = 3
UNION ALL SELECT id, 'Vsta', 0, 3, 5 FROM vs_stages WHERE stage_number = 3;

-- Stage 4: LCP 중위권팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Rest', 0, 3, 1 FROM vs_stages WHERE stage_number = 4
UNION ALL SELECT id, 'Karsa', 0, 3, 2 FROM vs_stages WHERE stage_number = 4
UNION ALL SELECT id, 'Maple', 0, 3, 3 FROM vs_stages WHERE stage_number = 4
UNION ALL SELECT id, 'Doggo', 0, 3, 4 FROM vs_stages WHERE stage_number = 4
UNION ALL SELECT id, 'Kaiwing', 0, 3, 5 FROM vs_stages WHERE stage_number = 4;

-- Stage 5: LTA 중위권팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Evi', 0, 3, 1 FROM vs_stages WHERE stage_number = 5
UNION ALL SELECT id, 'Steal', 0, 3, 2 FROM vs_stages WHERE stage_number = 5
UNION ALL SELECT id, 'Ceros', 0, 3, 3 FROM vs_stages WHERE stage_number = 5
UNION ALL SELECT id, 'Yutapon', 0, 3, 4 FROM vs_stages WHERE stage_number = 5
UNION ALL SELECT id, 'Harp', 0, 3, 5 FROM vs_stages WHERE stage_number = 5;

-- Stage 6: LCP/LTA 혼성
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Jojo', 0, 3, 1 FROM vs_stages WHERE stage_number = 6
UNION ALL SELECT id, 'Karsa', 0, 3, 2 FROM vs_stages WHERE stage_number = 6
UNION ALL SELECT id, 'Maple', 0, 3, 3 FROM vs_stages WHERE stage_number = 6
UNION ALL SELECT id, 'Doggo', 0, 3, 4 FROM vs_stages WHERE stage_number = 6
UNION ALL SELECT id, 'Vsta', 0, 3, 5 FROM vs_stages WHERE stage_number = 6;

-- Stage 7: LCP 강팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Rest', 0, 3, 1 FROM vs_stages WHERE stage_number = 7
UNION ALL SELECT id, 'JunJia', 0, 3, 2 FROM vs_stages WHERE stage_number = 7
UNION ALL SELECT id, 'Maple', 0, 3, 3 FROM vs_stages WHERE stage_number = 7
UNION ALL SELECT id, 'Doggo', 0, 3, 4 FROM vs_stages WHERE stage_number = 7
UNION ALL SELECT id, 'Kaiwing', 0, 3, 5 FROM vs_stages WHERE stage_number = 7;

-- Stage 8: LTA 강팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Evi', 0, 3, 1 FROM vs_stages WHERE stage_number = 8
UNION ALL SELECT id, 'Steal', 0, 3, 2 FROM vs_stages WHERE stage_number = 8
UNION ALL SELECT id, 'Ceros', 0, 3, 3 FROM vs_stages WHERE stage_number = 8
UNION ALL SELECT id, 'Yutapon', 0, 3, 4 FROM vs_stages WHERE stage_number = 8
UNION ALL SELECT id, 'Harp', 0, 3, 5 FROM vs_stages WHERE stage_number = 8;

-- Stage 9: LCP 올스타
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Rest', 0, 3, 1 FROM vs_stages WHERE stage_number = 9
UNION ALL SELECT id, 'Karsa', 0, 3, 2 FROM vs_stages WHERE stage_number = 9
UNION ALL SELECT id, 'Maple', 0, 3, 3 FROM vs_stages WHERE stage_number = 9
UNION ALL SELECT id, 'Doggo', 0, 3, 4 FROM vs_stages WHERE stage_number = 9
UNION ALL SELECT id, 'Kaiwing', 0, 3, 5 FROM vs_stages WHERE stage_number = 9;

-- Stage 10: LTA 올스타
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Jojo', 0, 3, 1 FROM vs_stages WHERE stage_number = 10
UNION ALL SELECT id, 'Steal', 0, 3, 2 FROM vs_stages WHERE stage_number = 10
UNION ALL SELECT id, 'Ceros', 0, 3, 3 FROM vs_stages WHERE stage_number = 10
UNION ALL SELECT id, 'Yutapon', 0, 3, 4 FROM vs_stages WHERE stage_number = 10
UNION ALL SELECT id, 'Harp', 0, 3, 5 FROM vs_stages WHERE stage_number = 10;

-- Stage 11: LCP/LTA 드림팀 (보스)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Jojo', 1, 4, 1 FROM vs_stages WHERE stage_number = 11
UNION ALL SELECT id, 'Karsa', 1, 4, 2 FROM vs_stages WHERE stage_number = 11
UNION ALL SELECT id, 'Maple', 1, 4, 3 FROM vs_stages WHERE stage_number = 11
UNION ALL SELECT id, 'Doggo', 1, 4, 4 FROM vs_stages WHERE stage_number = 11
UNION ALL SELECT id, 'Vsta', 1, 4, 5 FROM vs_stages WHERE stage_number = 11;

-- 12~22단계: 보통 (LPL/LCK/LEC, 강화 1~2)
-- Stage 12: LCK 하위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'DuDu', 1, 4, 1 FROM vs_stages WHERE stage_number = 12
UNION ALL SELECT id, 'Pyosik', 1, 4, 2 FROM vs_stages WHERE stage_number = 12
UNION ALL SELECT id, 'BuLLDoG', 1, 4, 3 FROM vs_stages WHERE stage_number = 12
UNION ALL SELECT id, 'Berserker', 1, 4, 4 FROM vs_stages WHERE stage_number = 12
UNION ALL SELECT id, 'Life', 1, 4, 5 FROM vs_stages WHERE stage_number = 12;

-- Stage 13: LEC 하위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Oscarinin', 1, 4, 1 FROM vs_stages WHERE stage_number = 13
UNION ALL SELECT id, 'Jankos', 1, 4, 2 FROM vs_stages WHERE stage_number = 13
UNION ALL SELECT id, 'Caps', 1, 4, 3 FROM vs_stages WHERE stage_number = 13
UNION ALL SELECT id, 'Rekkles', 1, 4, 4 FROM vs_stages WHERE stage_number = 13
UNION ALL SELECT id, 'Mikyx', 1, 4, 5 FROM vs_stages WHERE stage_number = 13;

-- Stage 14: LPL 하위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Breathe', 1, 4, 1 FROM vs_stages WHERE stage_number = 14
UNION ALL SELECT id, 'Weiwei', 1, 4, 2 FROM vs_stages WHERE stage_number = 14
UNION ALL SELECT id, 'Scout', 1, 4, 3 FROM vs_stages WHERE stage_number = 14
UNION ALL SELECT id, 'Viper', 1, 4, 4 FROM vs_stages WHERE stage_number = 14
UNION ALL SELECT id, 'Meiko', 1, 4, 5 FROM vs_stages WHERE stage_number = 14;

-- Stage 15: LCK 중위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Rich', 1, 4, 1 FROM vs_stages WHERE stage_number = 15
UNION ALL SELECT id, 'Sponge', 1, 4, 2 FROM vs_stages WHERE stage_number = 15
UNION ALL SELECT id, 'Kyeahoo', 1, 4, 3 FROM vs_stages WHERE stage_number = 15
UNION ALL SELECT id, 'Teddy', 1, 4, 4 FROM vs_stages WHERE stage_number = 15
UNION ALL SELECT id, 'Andil', 1, 4, 5 FROM vs_stages WHERE stage_number = 15;

-- Stage 16: LEC 중위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Oscarinin', 1, 4, 1 FROM vs_stages WHERE stage_number = 16
UNION ALL SELECT id, 'Jankos', 1, 4, 2 FROM vs_stages WHERE stage_number = 16
UNION ALL SELECT id, 'Caps', 1, 4, 3 FROM vs_stages WHERE stage_number = 16
UNION ALL SELECT id, 'Rekkles', 1, 4, 4 FROM vs_stages WHERE stage_number = 16
UNION ALL SELECT id, 'Hylissang', 1, 4, 5 FROM vs_stages WHERE stage_number = 16;

-- Stage 17: LPL 중위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'TheShy', 1, 4, 1 FROM vs_stages WHERE stage_number = 17
UNION ALL SELECT id, 'Karsa', 1, 4, 2 FROM vs_stages WHERE stage_number = 17
UNION ALL SELECT id, 'Rookie', 1, 4, 3 FROM vs_stages WHERE stage_number = 17
UNION ALL SELECT id, 'JackeyLove', 1, 4, 4 FROM vs_stages WHERE stage_number = 17
UNION ALL SELECT id, 'Baolan', 1, 4, 5 FROM vs_stages WHERE stage_number = 17;

-- Stage 18: LCK 강팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kingen', 1, 4, 1 FROM vs_stages WHERE stage_number = 18
UNION ALL SELECT id, 'GIDEON', 1, 4, 2 FROM vs_stages WHERE stage_number = 18
UNION ALL SELECT id, 'Calix', 1, 4, 3 FROM vs_stages WHERE stage_number = 18
UNION ALL SELECT id, 'Jiwoo', 1, 4, 4 FROM vs_stages WHERE stage_number = 18
UNION ALL SELECT id, 'Lehends', 1, 4, 5 FROM vs_stages WHERE stage_number = 18;

-- Stage 19: LEC 강팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Wunder', 2, 5, 1 FROM vs_stages WHERE stage_number = 19
UNION ALL SELECT id, 'Jankos', 2, 5, 2 FROM vs_stages WHERE stage_number = 19
UNION ALL SELECT id, 'Caps', 2, 5, 3 FROM vs_stages WHERE stage_number = 19
UNION ALL SELECT id, 'Rekkles', 2, 5, 4 FROM vs_stages WHERE stage_number = 19
UNION ALL SELECT id, 'Mikyx', 2, 5, 5 FROM vs_stages WHERE stage_number = 19;

-- Stage 20: LPL 강팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Breathe', 2, 5, 1 FROM vs_stages WHERE stage_number = 20
UNION ALL SELECT id, 'Weiwei', 2, 5, 2 FROM vs_stages WHERE stage_number = 20
UNION ALL SELECT id, 'Scout', 2, 5, 3 FROM vs_stages WHERE stage_number = 20
UNION ALL SELECT id, 'Viper', 2, 5, 4 FROM vs_stages WHERE stage_number = 20
UNION ALL SELECT id, 'Meiko', 2, 5, 5 FROM vs_stages WHERE stage_number = 20;

-- Stage 21: LCK 상위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Siwoo', 2, 5, 1 FROM vs_stages WHERE stage_number = 21
UNION ALL SELECT id, 'Lucid', 2, 5, 2 FROM vs_stages WHERE stage_number = 21
UNION ALL SELECT id, 'ShowMaker', 2, 5, 3 FROM vs_stages WHERE stage_number = 21
UNION ALL SELECT id, 'Aiming', 2, 5, 4 FROM vs_stages WHERE stage_number = 21
UNION ALL SELECT id, 'BeryL', 2, 5, 5 FROM vs_stages WHERE stage_number = 21;

-- Stage 22: 국제 혼성팀 (보스)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'TheShy', 2, 5, 1 FROM vs_stages WHERE stage_number = 22
UNION ALL SELECT id, 'Weiwei', 2, 5, 2 FROM vs_stages WHERE stage_number = 22
UNION ALL SELECT id, 'Caps', 2, 5, 3 FROM vs_stages WHERE stage_number = 22
UNION ALL SELECT id, 'Viper', 2, 5, 4 FROM vs_stages WHERE stage_number = 22
UNION ALL SELECT id, 'Keria', 2, 5, 5 FROM vs_stages WHERE stage_number = 22;

-- 23~33단계: 어려움 (LPL/LCK/LEC, 강화 2~4)
-- Stage 23: LCK 최상위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Doran', 2, 4, 1 FROM vs_stages WHERE stage_number = 23
UNION ALL SELECT id, 'Peanut', 2, 4, 2 FROM vs_stages WHERE stage_number = 23
UNION ALL SELECT id, 'zeka', 2, 4, 3 FROM vs_stages WHERE stage_number = 23
UNION ALL SELECT id, 'Viper', 2, 4, 4 FROM vs_stages WHERE stage_number = 23
UNION ALL SELECT id, 'Delight', 2, 4, 5 FROM vs_stages WHERE stage_number = 23;

-- Stage 24: LPL 최상위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Breathe', 2, 4, 1 FROM vs_stages WHERE stage_number = 24
UNION ALL SELECT id, 'Weiwei', 2, 4, 2 FROM vs_stages WHERE stage_number = 24
UNION ALL SELECT id, 'Scout', 2, 4, 3 FROM vs_stages WHERE stage_number = 24
UNION ALL SELECT id, 'Viper', 2, 4, 4 FROM vs_stages WHERE stage_number = 24
UNION ALL SELECT id, 'Meiko', 2, 4, 5 FROM vs_stages WHERE stage_number = 24;

-- Stage 25: LEC 최상위팀
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Wunder', 2, 4, 1 FROM vs_stages WHERE stage_number = 25
UNION ALL SELECT id, 'Jankos', 2, 4, 2 FROM vs_stages WHERE stage_number = 25
UNION ALL SELECT id, 'Caps', 2, 4, 3 FROM vs_stages WHERE stage_number = 25
UNION ALL SELECT id, 'Rekkles', 2, 4, 4 FROM vs_stages WHERE stage_number = 25
UNION ALL SELECT id, 'Hylissang', 2, 4, 5 FROM vs_stages WHERE stage_number = 25;

-- Stage 26: Gen.G
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 3, 7, 1 FROM vs_stages WHERE stage_number = 26
UNION ALL SELECT id, 'Canyon', 3, 7, 2 FROM vs_stages WHERE stage_number = 26
UNION ALL SELECT id, 'Chovy', 3, 7, 3 FROM vs_stages WHERE stage_number = 26
UNION ALL SELECT id, 'Ruler', 3, 7, 4 FROM vs_stages WHERE stage_number = 26
UNION ALL SELECT id, 'Duro', 3, 7, 5 FROM vs_stages WHERE stage_number = 26;

-- Stage 27: T1
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 3, 7, 1 FROM vs_stages WHERE stage_number = 27
UNION ALL SELECT id, 'Oner', 3, 7, 2 FROM vs_stages WHERE stage_number = 27
UNION ALL SELECT id, 'Faker', 3, 7, 3 FROM vs_stages WHERE stage_number = 27
UNION ALL SELECT id, 'Gumayusi', 3, 7, 4 FROM vs_stages WHERE stage_number = 27
UNION ALL SELECT id, 'Keria', 3, 7, 5 FROM vs_stages WHERE stage_number = 27;

-- Stage 28: LPL 챔피언
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Breathe', 3, 7, 1 FROM vs_stages WHERE stage_number = 28
UNION ALL SELECT id, 'Weiwei', 3, 7, 2 FROM vs_stages WHERE stage_number = 28
UNION ALL SELECT id, 'Scout', 3, 7, 3 FROM vs_stages WHERE stage_number = 28
UNION ALL SELECT id, 'Viper', 3, 7, 4 FROM vs_stages WHERE stage_number = 28
UNION ALL SELECT id, 'Meiko', 3, 7, 5 FROM vs_stages WHERE stage_number = 28;

-- Stage 29: LEC 챔피언
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Wunder', 3, 7, 1 FROM vs_stages WHERE stage_number = 29
UNION ALL SELECT id, 'Jankos', 3, 7, 2 FROM vs_stages WHERE stage_number = 29
UNION ALL SELECT id, 'Caps', 3, 7, 3 FROM vs_stages WHERE stage_number = 29
UNION ALL SELECT id, 'Rekkles', 3, 7, 4 FROM vs_stages WHERE stage_number = 29
UNION ALL SELECT id, 'Hylissang', 3, 7, 5 FROM vs_stages WHERE stage_number = 29;

-- Stage 30: 국제 드림팀 1
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 3, 7, 1 FROM vs_stages WHERE stage_number = 30
UNION ALL SELECT id, 'Canyon', 3, 7, 2 FROM vs_stages WHERE stage_number = 30
UNION ALL SELECT id, 'Faker', 3, 7, 3 FROM vs_stages WHERE stage_number = 30
UNION ALL SELECT id, 'Viper', 3, 7, 4 FROM vs_stages WHERE stage_number = 30
UNION ALL SELECT id, 'Keria', 3, 7, 5 FROM vs_stages WHERE stage_number = 30;

-- Stage 31: 국제 드림팀 2
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 3, 7, 1 FROM vs_stages WHERE stage_number = 31
UNION ALL SELECT id, 'Peanut', 3, 7, 2 FROM vs_stages WHERE stage_number = 31
UNION ALL SELECT id, 'Chovy', 3, 7, 3 FROM vs_stages WHERE stage_number = 31
UNION ALL SELECT id, 'Ruler', 3, 7, 4 FROM vs_stages WHERE stage_number = 31
UNION ALL SELECT id, 'Meiko', 3, 7, 5 FROM vs_stages WHERE stage_number = 31;

-- Stage 32: 국제 드림팀 3
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'TheShy', 4, 8, 1 FROM vs_stages WHERE stage_number = 32
UNION ALL SELECT id, 'Canyon', 4, 8, 2 FROM vs_stages WHERE stage_number = 32
UNION ALL SELECT id, 'Caps', 4, 8, 3 FROM vs_stages WHERE stage_number = 32
UNION ALL SELECT id, 'Gumayusi', 4, 8, 4 FROM vs_stages WHERE stage_number = 32
UNION ALL SELECT id, 'Keria', 4, 8, 5 FROM vs_stages WHERE stage_number = 32;

-- Stage 33: 어려움 최종보스
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 4, 8, 1 FROM vs_stages WHERE stage_number = 33
UNION ALL SELECT id, 'Canyon', 4, 8, 2 FROM vs_stages WHERE stage_number = 33
UNION ALL SELECT id, 'Chovy', 4, 8, 3 FROM vs_stages WHERE stage_number = 33
UNION ALL SELECT id, 'Ruler', 4, 8, 4 FROM vs_stages WHERE stage_number = 33
UNION ALL SELECT id, 'Keria', 4, 8, 5 FROM vs_stages WHERE stage_number = 33;

-- 34~49단계: 지옥 (강화 5~9)
-- Stage 34-38: Gen.G 최강 로테이션
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 5, 9, 1 FROM vs_stages WHERE stage_number = 34
UNION ALL SELECT id, 'Canyon', 5, 9, 2 FROM vs_stages WHERE stage_number = 34
UNION ALL SELECT id, 'Chovy', 5, 9, 3 FROM vs_stages WHERE stage_number = 34
UNION ALL SELECT id, 'Ruler', 5, 9, 4 FROM vs_stages WHERE stage_number = 34
UNION ALL SELECT id, 'Duro', 5, 9, 5 FROM vs_stages WHERE stage_number = 34;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 5, 9, 1 FROM vs_stages WHERE stage_number = 35
UNION ALL SELECT id, 'Oner', 5, 9, 2 FROM vs_stages WHERE stage_number = 35
UNION ALL SELECT id, 'Faker', 5, 9, 3 FROM vs_stages WHERE stage_number = 35
UNION ALL SELECT id, 'Gumayusi', 5, 9, 4 FROM vs_stages WHERE stage_number = 35
UNION ALL SELECT id, 'Keria', 5, 9, 5 FROM vs_stages WHERE stage_number = 35;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 6, 10, 1 FROM vs_stages WHERE stage_number = 36
UNION ALL SELECT id, 'Peanut', 6, 10, 2 FROM vs_stages WHERE stage_number = 36
UNION ALL SELECT id, 'Chovy', 6, 10, 3 FROM vs_stages WHERE stage_number = 36
UNION ALL SELECT id, 'Viper', 6, 10, 4 FROM vs_stages WHERE stage_number = 36
UNION ALL SELECT id, 'Keria', 6, 10, 5 FROM vs_stages WHERE stage_number = 36;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 6, 10, 1 FROM vs_stages WHERE stage_number = 37
UNION ALL SELECT id, 'Canyon', 6, 10, 2 FROM vs_stages WHERE stage_number = 37
UNION ALL SELECT id, 'Faker', 6, 10, 3 FROM vs_stages WHERE stage_number = 37
UNION ALL SELECT id, 'Ruler', 6, 10, 4 FROM vs_stages WHERE stage_number = 37
UNION ALL SELECT id, 'Keria', 6, 10, 5 FROM vs_stages WHERE stage_number = 37;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'TheShy', 6, 10, 1 FROM vs_stages WHERE stage_number = 38
UNION ALL SELECT id, 'Canyon', 6, 10, 2 FROM vs_stages WHERE stage_number = 38
UNION ALL SELECT id, 'Chovy', 6, 10, 3 FROM vs_stages WHERE stage_number = 38
UNION ALL SELECT id, 'Ruler', 6, 10, 4 FROM vs_stages WHERE stage_number = 38
UNION ALL SELECT id, 'Meiko', 6, 10, 5 FROM vs_stages WHERE stage_number = 38;

-- Stage 39-43: 전설팀 (강화 7~8)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 7, 10, 1 FROM vs_stages WHERE stage_number = 39
UNION ALL SELECT id, 'Canyon', 7, 10, 2 FROM vs_stages WHERE stage_number = 39
UNION ALL SELECT id, 'Chovy', 7, 10, 3 FROM vs_stages WHERE stage_number = 39
UNION ALL SELECT id, 'Viper', 7, 10, 4 FROM vs_stages WHERE stage_number = 39
UNION ALL SELECT id, 'Keria', 7, 10, 5 FROM vs_stages WHERE stage_number = 39;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 7, 10, 1 FROM vs_stages WHERE stage_number = 40
UNION ALL SELECT id, 'Canyon', 7, 10, 2 FROM vs_stages WHERE stage_number = 40
UNION ALL SELECT id, 'Faker', 7, 10, 3 FROM vs_stages WHERE stage_number = 40
UNION ALL SELECT id, 'Ruler', 7, 10, 4 FROM vs_stages WHERE stage_number = 40
UNION ALL SELECT id, 'Keria', 7, 10, 5 FROM vs_stages WHERE stage_number = 40;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 7, 10, 1 FROM vs_stages WHERE stage_number = 41
UNION ALL SELECT id, 'Peanut', 7, 10, 2 FROM vs_stages WHERE stage_number = 41
UNION ALL SELECT id, 'Chovy', 7, 10, 3 FROM vs_stages WHERE stage_number = 41
UNION ALL SELECT id, 'Gumayusi', 7, 10, 4 FROM vs_stages WHERE stage_number = 41
UNION ALL SELECT id, 'Keria', 7, 10, 5 FROM vs_stages WHERE stage_number = 41;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 8, 10, 1 FROM vs_stages WHERE stage_number = 42
UNION ALL SELECT id, 'Canyon', 8, 10, 2 FROM vs_stages WHERE stage_number = 42
UNION ALL SELECT id, 'Faker', 8, 10, 3 FROM vs_stages WHERE stage_number = 42
UNION ALL SELECT id, 'Viper', 8, 10, 4 FROM vs_stages WHERE stage_number = 42
UNION ALL SELECT id, 'Keria', 8, 10, 5 FROM vs_stages WHERE stage_number = 42;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 8, 10, 1 FROM vs_stages WHERE stage_number = 43
UNION ALL SELECT id, 'Canyon', 8, 10, 2 FROM vs_stages WHERE stage_number = 43
UNION ALL SELECT id, 'Chovy', 8, 10, 3 FROM vs_stages WHERE stage_number = 43
UNION ALL SELECT id, 'Ruler', 8, 10, 4 FROM vs_stages WHERE stage_number = 43
UNION ALL SELECT id, 'Keria', 8, 10, 5 FROM vs_stages WHERE stage_number = 43;

-- Stage 44-48: 최종 관문 (강화 9)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 9, 10, 1 FROM vs_stages WHERE stage_number = 44
UNION ALL SELECT id, 'Canyon', 9, 10, 2 FROM vs_stages WHERE stage_number = 44
UNION ALL SELECT id, 'Faker', 9, 10, 3 FROM vs_stages WHERE stage_number = 44
UNION ALL SELECT id, 'Ruler', 9, 10, 4 FROM vs_stages WHERE stage_number = 44
UNION ALL SELECT id, 'Keria', 9, 10, 5 FROM vs_stages WHERE stage_number = 44;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 9, 10, 1 FROM vs_stages WHERE stage_number = 45
UNION ALL SELECT id, 'Canyon', 9, 10, 2 FROM vs_stages WHERE stage_number = 45
UNION ALL SELECT id, 'Chovy', 9, 10, 3 FROM vs_stages WHERE stage_number = 45
UNION ALL SELECT id, 'Viper', 9, 10, 4 FROM vs_stages WHERE stage_number = 45
UNION ALL SELECT id, 'Keria', 9, 10, 5 FROM vs_stages WHERE stage_number = 45;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 9, 10, 1 FROM vs_stages WHERE stage_number = 46
UNION ALL SELECT id, 'Peanut', 9, 10, 2 FROM vs_stages WHERE stage_number = 46
UNION ALL SELECT id, 'Faker', 9, 10, 3 FROM vs_stages WHERE stage_number = 46
UNION ALL SELECT id, 'Gumayusi', 9, 10, 4 FROM vs_stages WHERE stage_number = 46
UNION ALL SELECT id, 'Keria', 9, 10, 5 FROM vs_stages WHERE stage_number = 46;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 9, 10, 1 FROM vs_stages WHERE stage_number = 47
UNION ALL SELECT id, 'Canyon', 9, 10, 2 FROM vs_stages WHERE stage_number = 47
UNION ALL SELECT id, 'Chovy', 9, 10, 3 FROM vs_stages WHERE stage_number = 47
UNION ALL SELECT id, 'Ruler', 9, 10, 4 FROM vs_stages WHERE stage_number = 47
UNION ALL SELECT id, 'Keria', 9, 10, 5 FROM vs_stages WHERE stage_number = 47;

INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Kiin', 9, 10, 1 FROM vs_stages WHERE stage_number = 48
UNION ALL SELECT id, 'Canyon', 9, 10, 2 FROM vs_stages WHERE stage_number = 48
UNION ALL SELECT id, 'Faker', 9, 10, 3 FROM vs_stages WHERE stage_number = 48
UNION ALL SELECT id, 'Viper', 9, 10, 4 FROM vs_stages WHERE stage_number = 48
UNION ALL SELECT id, 'Keria', 9, 10, 5 FROM vs_stages WHERE stage_number = 48;

-- Stage 49: 지옥 최종 보스 (강화 10)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Zeus', 10, 10, 1 FROM vs_stages WHERE stage_number = 49
UNION ALL SELECT id, 'Canyon', 10, 10, 2 FROM vs_stages WHERE stage_number = 49
UNION ALL SELECT id, 'Faker', 10, 10, 3 FROM vs_stages WHERE stage_number = 49
UNION ALL SELECT id, 'Ruler', 10, 10, 4 FROM vs_stages WHERE stage_number = 49
UNION ALL SELECT id, 'Keria', 10, 10, 5 FROM vs_stages WHERE stage_number = 49;

-- Stage 50: 궁극의 도전 - ICON 올스타 (일반 8강, 하드 10강)
INSERT INTO vs_stage_enemies (stage_id, player_name, enhancement_level, hard_enhancement_level, position_order)
SELECT id, 'Nuguri', 8, 10, 1 FROM vs_stages WHERE stage_number = 50
UNION ALL SELECT id, 'Bengi', 8, 10, 2 FROM vs_stages WHERE stage_number = 50
UNION ALL SELECT id, 'Perkz', 8, 10, 3 FROM vs_stages WHERE stage_number = 50
UNION ALL SELECT id, 'Uzi', 8, 10, 4 FROM vs_stages WHERE stage_number = 50
UNION ALL SELECT id, 'Mata', 8, 10, 5 FROM vs_stages WHERE stage_number = 50;
