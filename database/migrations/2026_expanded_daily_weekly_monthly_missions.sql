-- Expanded, server-verified daily/weekly/monthly missions (KST).
-- Run once before restarting backend. Safe to rerun: titles are unique per period.
-- Old mission rows / user mission history are preserved; obsolete goals are hidden.
USE lol_card_game;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1;
UPDATE missions SET is_active=0
 WHERE title IN (
  '일일 AI 배틀','일일 랭크 매치','일일 카드 뽑기',
  '주간 AI 배틀','주간 랭크 매치','주간 카드 뽑기',
  '월간 AI 배틀','월간 카드 뽑기',
  '일일 로그인','카드 뽑기','경기 승리','덱 편성','출석 체크',
  '주간 승리왕','카드 컬렉터','덱 마스터','연승 달성','트레이드 왕'
 );
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '첫 카드 뽑기','카드 1장을 뽑으세요','DAILY','gacha',1,90,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='첫 카드 뽑기');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '오늘의 수집가','카드 5장을 획득하세요','DAILY','card_collect',5,180,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='오늘의 수집가');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '카드 열 장 모으기','카드 10장을 획득하세요','DAILY','card_collect',10,260,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='카드 열 장 모으기');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '팩 한 번 개봉','보유 카드팩 1개를 개봉하세요','DAILY','pack_open',1,140,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='팩 한 번 개봉');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT 'AI 첫 경기','AI 대전 1시리즈를 마치세요','DAILY','ai_battle',1,110,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='AI 첫 경기');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT 'AI 3연습','AI 대전 3시리즈를 마치세요','DAILY','ai_battle',3,230,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='AI 3연습');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT 'AI 승리','AI 대전에서 1시리즈 승리하세요','DAILY','ai_win',1,190,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='AI 승리');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '전술 연습','AI 대전 라운드 5회를 플레이하세요','DAILY','ai_round',5,150,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='전술 연습');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '진짜 경쟁전 참가','다른 유저와 경쟁전 1시리즈를 마치세요','DAILY','rank_match',1,230,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='진짜 경쟁전 참가');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '오늘의 PvP 승리','유저 경쟁전에서 1시리즈 승리하세요','DAILY','rank_win',1,360,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='오늘의 PvP 승리');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '한타 준비','유저 경쟁전 라운드를 3회 진행하세요','DAILY','rank_round',3,170,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='한타 준비');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '덱 구성','덱을 1회 저장하세요','DAILY','deck_save',1,100,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='덱 구성');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '덱 전술 조정','덱을 3회 저장하세요','DAILY','deck_save',3,170,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='덱 전술 조정');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '거래소 판매 등록','거래소에 카드를 1회 등록하세요','DAILY','market_list',1,110,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='거래소 판매 등록');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '거래소 쇼핑','거래소에서 카드를 1장 구매하세요','DAILY','market_buy',1,200,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='거래소 쇼핑');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '카드 거래 완료','카드 1장 판매를 완료하세요','DAILY','market_sell',1,190,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='카드 거래 완료');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '강화 도전','카드 강화를 1번 시도하세요','DAILY','enhance_attempt',1,110,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='강화 도전');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '강화 성공','카드 강화를 1번 성공하세요','DAILY','enhance_success',1,230,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='DAILY' AND title='강화 성공');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '주간 카드 수집 20','카드를 20장 획득하세요','WEEKLY','card_collect',20,500,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='주간 카드 수집 20');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '주간 카드 수집 50','카드를 50장 획득하세요','WEEKLY','card_collect',50,1000,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='주간 카드 수집 50');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '주간 뽑기 10','카드를 10번 뽑으세요','WEEKLY','gacha',10,320,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='주간 뽑기 10');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '주간 팩 개봉','카드팩 5개를 개봉하세요','WEEKLY','pack_open',5,500,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='주간 팩 개봉');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT 'AI 마라톤','AI 대전 10시리즈를 마치세요','WEEKLY','ai_battle',10,650,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='AI 마라톤');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT 'AI 전략왕','AI 대전에서 5시리즈 승리하세요','WEEKLY','ai_win',5,850,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='AI 전략왕');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '전술 30라운드','AI 대전 30라운드를 플레이하세요','WEEKLY','ai_round',30,550,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='전술 30라운드');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT 'PvP 출전 5회','유저 경쟁전을 5시리즈 마치세요','WEEKLY','rank_match',5,1000,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='PvP 출전 5회');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT 'PvP 주간 3승','유저 경쟁전에서 3시리즈 승리하세요','WEEKLY','rank_win',3,1300,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='PvP 주간 3승');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT 'PvP 15라운드','유저 경쟁전 15라운드를 플레이하세요','WEEKLY','rank_round',15,700,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='PvP 15라운드');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '주간 덱 연구','덱을 7회 저장하세요','WEEKLY','deck_save',7,450,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='주간 덱 연구');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '주간 거래소 등록','거래소에 카드를 5장 등록하세요','WEEKLY','market_list',5,550,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='주간 거래소 등록');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '주간 카드 구매','거래소에서 카드 3장을 구매하세요','WEEKLY','market_buy',3,650,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='주간 카드 구매');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '주간 강화 도전','강화를 5회 시도하세요','WEEKLY','enhance_attempt',5,600,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='주간 강화 도전');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '주간 강화 성공','강화를 3회 성공하세요','WEEKLY','enhance_success',3,850,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='WEEKLY' AND title='주간 강화 성공');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 컬렉터 100','카드 100장을 획득하세요','MONTHLY','card_collect',100,2000,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 컬렉터 100');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 카드 250','카드 250장을 획득하세요','MONTHLY','card_collect',250,3800,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 카드 250');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 뽑기 장인','카드 뽑기를 50번 하세요','MONTHLY','gacha',50,1750,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 뽑기 장인');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 개봉왕','카드팩 20개를 개봉하세요','MONTHLY','pack_open',20,1900,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 개봉왕');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 AI 마스터','AI 대전 35시리즈를 마치세요','MONTHLY','ai_battle',35,2000,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 AI 마스터');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 AI 챔피언','AI 대전 20시리즈 승리하세요','MONTHLY','ai_win',20,2700,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 AI 챔피언');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 AI 운영','AI 대전 100라운드를 플레이하세요','MONTHLY','ai_round',100,1500,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 AI 운영');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 PvP 참전자','유저 경쟁전 20시리즈를 마치세요','MONTHLY','rank_match',20,2900,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 PvP 참전자');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 PvP 챔피언','유저 경쟁전 12시리즈 승리하세요','MONTHLY','rank_win',12,4500,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 PvP 챔피언');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 PvP 전술가','유저 경쟁전 60라운드를 진행하세요','MONTHLY','rank_round',60,2400,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 PvP 전술가');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 덱 연구가','덱을 25회 저장하세요','MONTHLY','deck_save',25,1500,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 덱 연구가');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 거래소 상인','카드를 15장 판매 등록하세요','MONTHLY','market_list',15,1800,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 거래소 상인');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 카드 쇼핑','거래소에서 10장을 구매하세요','MONTHLY','market_buy',10,2700,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 카드 쇼핑');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 강화 장인','강화에 20번 도전하세요','MONTHLY','enhance_attempt',20,2500,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 강화 장인');
INSERT INTO missions (title,description,type,mission_type,requirement,reward,is_active)
SELECT '월간 강화 성공왕','강화를 10번 성공하세요','MONTHLY','enhance_success',10,3400,1
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE type='MONTHLY' AND title='월간 강화 성공왕');
SELECT type,COUNT(*) AS enabled_missions FROM missions WHERE is_active=1 GROUP BY type ORDER BY FIELD(type,'DAILY','WEEKLY','MONTHLY');
