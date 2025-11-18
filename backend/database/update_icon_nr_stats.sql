-- Update ICON and NR player stats proportional to overall rating
USE lol_card_game;

-- [ICON] Mystic (overall 119) - 울트라 하이퍼 캐리 ADC
DELETE FROM player_stats WHERE player_id = 1062;
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(1062, 115, 122, 128, 110, 118, 121);

-- [ICON] Deft (overall 121) - 완벽한 포지셔닝의 ADC
DELETE FROM player_stats WHERE player_id = 1063;
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(1063, 120, 127, 126, 115, 123, 125);

-- [ICON] Peanut (overall 118) - 공격적인 정글러
DELETE FROM player_stats WHERE player_id = 1064;
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(1064, 114, 119, 122, 124, 121, 118);

-- [NR] Mystic (overall 114) - 초반 강력한 ADC
DELETE FROM player_stats WHERE player_id = 1065;
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(1065, 112, 117, 121, 108, 113, 115);

-- [NR] Deft (overall 116) - 안정적인 후반 캐리
DELETE FROM player_stats WHERE player_id = 1066;
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(1066, 115, 120, 119, 110, 117, 118);

-- [NR] Peanut (overall 113) - 적극적인 갱커
DELETE FROM player_stats WHERE player_id = 1067;
INSERT INTO player_stats (player_id, laning, mechanics, teamfight, vision, macro, mental) VALUES
(1067, 110, 114, 117, 118, 116, 113);

-- 결과 확인
SELECT
  p.name,
  p.overall,
  ps.laning,
  ps.mechanics,
  ps.teamfight,
  ps.vision,
  ps.macro,
  ps.mental,
  ROUND((ps.laning + ps.mechanics + ps.teamfight + ps.vision + ps.macro + ps.mental) / 6, 1) as avg_stat
FROM players p
LEFT JOIN player_stats ps ON p.id = ps.player_id
WHERE p.name LIKE '%Mystic%' OR p.name LIKE '%Deft%' OR p.name LIKE '%Peanut%'
ORDER BY p.name, p.id;

SELECT '능력치 업데이트 완료!' as Status;
