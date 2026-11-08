-- 12WR: Season 2 World Championship (2012) 12 teams / 60 starters.
-- Game-balance OVR values are subjective, not official historical ratings.
-- Source roster: https://namu.wiki/w/리그%20오브%20레전드%20시즌2%20월드%20챔피언십/로스터
-- Additive and re-runnable: never overwrite preexisting player edits or card ownership.
USE lol_card_game;

CREATE TEMPORARY TABLE tmp_12wr_roster (
 name VARCHAR(50) NOT NULL, team VARCHAR(50) NOT NULL,
 position ENUM('TOP','JUNGLE','MID','ADC','SUPPORT') NOT NULL,
 overall INT NOT NULL, region VARCHAR(20) NOT NULL,
 nationality CHAR(2) NOT NULL,
 UNIQUE KEY uq_12wr (name,team,position)
);
INSERT INTO tmp_12wr_roster (name,team,position,overall,region,nationality) VALUES
('Stanley','TPA','TOP',90,'LCP','TW'),
('Lilballz','TPA','JUNGLE',88,'LCP','TW'),
('Toyz','TPA','MID',98,'LCP','HK'),
('Bebe','TPA','ADC',93,'LCP','TW'),
('MiSTakE','TPA','SUPPORT',90,'LCP','TW'),
('Shy','AZF','TOP',90,'LCK','KR'),
('CloudTemplar','AZF','JUNGLE',88,'LCK','KR'),
('RapidStar','AZF','MID',91,'LCK','KR'),
('Woong','AZF','ADC',86,'LCK','KR'),
('MadLife','AZF','SUPPORT',92,'LCK','KR'),
('Darien','M5','TOP',88,'LEC','RU'),
('Diamondprox','M5','JUNGLE',92,'LEC','RU'),
('Alex Ich','M5','MID',91,'LEC','RU'),
('Genja','M5','ADC',87,'LEC','RU'),
('GoSu Pepper','M5','SUPPORT',87,'LEC','AM'),
('Wickd','CLG.EU','TOP',86,'LEC','DK'),
('Snoopeh','CLG.EU','JUNGLE',85,'LEC','GB'),
('Froggen','CLG.EU','MID',92,'LEC','DK'),
('yellowpete','CLG.EU','ADC',85,'LEC','DE'),
('Krepo','CLG.EU','SUPPORT',86,'LEC','BE'),
('MaKNooN','NJS','TOP',90,'LCK','KR'),
('Watch','NJS','JUNGLE',86,'LCK','KR'),
('SSONG','NJS','MID',85,'LCK','KR'),
('PraY','NJS','ADC',90,'LCK','KR'),
('Cain','NJS','SUPPORT',84,'LCK','KR'),
('CaoMei','WE','TOP',84,'LPL','CN'),
('ClearLove','WE','JUNGLE',87,'LPL','CN'),
('Misaya','WE','MID',90,'LPL','CN'),
('Weixiao','WE','ADC',91,'LPL','CN'),
('FZZF','WE','SUPPORT',85,'LPL','CN'),
('PDD','iG','TOP',89,'LPL','CN'),
('illuSioN','iG','JUNGLE',82,'LPL','CN'),
('Zz1tai','iG','MID',86,'LPL','CN'),
('Kid','iG','ADC',84,'LPL','CN'),
('XiaoXiao','iG','SUPPORT',82,'LPL','CN'),
('Dyrus','TSM','TOP',87,'LCS','US'),
('TheOddOne','TSM','JUNGLE',86,'LCS','CA'),
('Reginald','TSM','MID',85,'LCS','US'),
('Chaox','TSM','ADC',86,'LCS','CA'),
('Xpecial','TSM','SUPPORT',86,'LCS','US'),
('Voyboy','CLG Prime','TOP',86,'LCS','US'),
('HotshotGG','CLG Prime','JUNGLE',84,'LCS','CA'),
('bigfatlp','CLG Prime','MID',82,'LCS','CA'),
('Doublelift','CLG Prime','ADC',90,'LCS','US'),
('Chauster','CLG Prime','SUPPORT',84,'LCS','US'),
('Kev1n','SK','TOP',81,'LEC','DE'),
('Araneae','SK','JUNGLE',80,'LEC','ES'),
('ocelote','SK','MID',84,'LEC','ES'),
('YellOwStaR','SK','ADC',84,'LEC','FR'),
('Nyph','SK','SUPPORT',79,'LEC','DE'),
('Crumbzz','DIG','TOP',79,'LCS','VE'),
('IWillDominate','DIG','JUNGLE',82,'LCS','US'),
('scarra','DIG','MID',85,'LCS','US'),
('imaqtpie','DIG','ADC',82,'LCS','US'),
('Patoy','DIG','SUPPORT',79,'LCS','US'),
('QTV','SAJ','TOP',78,'LCP','VN'),
('Violet','SAJ','JUNGLE',76,'LCP','VN'),
('NIXWATER','SAJ','MID',80,'LCP','VN'),
('Archie','SAJ','ADC',79,'LCP','VN'),
('Junie','SAJ','SUPPORT',70,'LCP','VN');

INSERT INTO players (name,team,position,overall,region,tier,season,nationality,salary,image_url)
SELECT s.name,s.team,s.position,s.overall,s.region,
 CASE WHEN s.overall<=80 THEN 'COMMON' WHEN s.overall<=90 THEN 'RARE' ELSE 'EPIC' END,
 '12WR',s.nationality,
 CASE WHEN s.overall<=74 THEN 5 WHEN s.overall<=79 THEN 6
      WHEN s.overall<=84 THEN 8 WHEN s.overall<=89 THEN 10
      WHEN s.overall<=94 THEN 12 ELSE 14 END,NULL
FROM tmp_12wr_roster s
WHERE NOT EXISTS (
 SELECT 1 FROM players p WHERE p.season='12WR' AND p.name=s.name
 AND p.team=s.team AND p.position=s.position
);
DROP TEMPORARY TABLE tmp_12wr_roster;
SELECT season,COUNT(*) AS cards,MIN(overall) AS min_ovr,MAX(overall) AS max_ovr
FROM players WHERE season='12WR' GROUP BY season;
