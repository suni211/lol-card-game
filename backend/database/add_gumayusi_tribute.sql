-- 구마유시 헌정 카드 추가
INSERT INTO players (name, team, position, overall, region, tier, season, laning, teamfight, macro, mental, image_url)
VALUES (
  'Gumayusi',
  'T1',
  'ADC',
  102,
  'LCK',
  'LEGENDARY',
  'T1',
  99,
  99,
  98,
  99,
  '/images/players/T1_Gumayusi.png'
);

-- 구마유시 카드 특성 추가
INSERT INTO player_traits (player_id, name, description, effect)
SELECT
  p.id,
  '월드 챔피언',
  'T1 월드 챔피언십 우승 헌정 카드',
  '+15% 전체 능력치'
FROM players p
WHERE p.name = 'Gumayusi' AND p.season = 'T1'
LIMIT 1;

INSERT INTO player_traits (player_id, name, description, effect)
SELECT
  p.id,
  '완벽한 포지셔닝',
  '한타에서 최적의 위치를 찾아냅니다',
  '+20% 한타 능력'
FROM players p
WHERE p.name = 'Gumayusi' AND p.season = 'T1'
LIMIT 1;

INSERT INTO player_traits (player_id, name, description, effect)
SELECT
  p.id,
  '캐리 본능',
  '중요한 순간 캐리력 발휘',
  '+25% 클러치 상황 능력치'
FROM players p
WHERE p.name = 'Gumayusi' AND p.season = 'T1'
LIMIT 1;
