-- 2026 card reveal: true player nationality (ISO 3166-1 alpha-2).
-- Competition regions (LCK/LPL/etc.) are NOT player nationalities.
-- Safe to run more than once on MySQL 8 / MariaDB.
USE lol_card_game;
SET @has_col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='players' AND COLUMN_NAME='nationality');
SET @ddl = IF(@has_col=0,
  'ALTER TABLE players ADD COLUMN nationality CHAR(2) NULL DEFAULT NULL',
  'SELECT 1');
PREPARE add_nat FROM @ddl;
EXECUTE add_nat;
DEALLOCATE PREPARE add_nat;

-- Starter nationality data for well-known 2026 participants.
-- Unknown/uncertain nationalities are intentionally NULL until the admin confirms.
-- Updates apply to all three cards of the same player/team.
UPDATE players SET nationality='KR' WHERE season IN ('26 LIVE','26WR','26WRs') AND (
  (team='GEN.G' AND name IN ('Kiin','Canyon','Chovy','Ruler','Duro')) OR
  (team='HLE' AND name IN ('Zeus','Kanavi','Zeka','Gumayusi','Delight')) OR
  (team='T1' AND name IN ('Doran','Oner','Faker','Peyz','Keria')) OR
  (team='DK' AND name IN ('Siwoo','Lucid','ShowMaker','Smash','Career')) OR
  (team='AL' AND name IN ('Tarzan','Kael')) OR
  (team='BLG' AND name='Viper') OR
  (team='IG' AND name IN ('TheShy','Rookie')) OR
  (team='KC' AND name IN ('Canna','kyeahoo')) OR
  (team='TLAW' AND name IN ('Morgan','Quid','CoreJJ')) OR
  (team='LYON' AND name='Berserker') OR
  (team='C9' AND name IN ('Thanatos','Loki')) OR
  (team='MVK' AND name='Gury') OR
  (team='LOS' AND name IN ('Zest','Feisty'))
);
UPDATE players SET nationality='CN' WHERE season IN ('26 LIVE','26WR','26WRs') AND (
  (team='AL' AND name IN ('Breathe','Shanks','Hope')) OR
  (team='BLG' AND name IN ('Bin','Xun','Knight','ON')) OR
  (team='TES' AND name IN ('369','Tian','Creme','JackeyLove','Zhuo')) OR
  (team='IG' AND name IN ('Wei','JiaQi','Meiko'))
);
UPDATE players SET nationality='FR' WHERE season IN ('26 LIVE','26WR','26WRs') AND (
  (team='G2' AND name IN ('SkewMond','Hans Sama')) OR
  (team='KC' AND name='Caliste')
);
UPDATE players SET nationality='ES' WHERE season IN ('26 LIVE','26WR','26WRs') AND team='MKOI'
  AND name IN ('Myrwn','Elyoya','Supa','Alvaro');
UPDATE players SET nationality='DK' WHERE season IN ('26 LIVE','26WR','26WRs') AND team='G2' AND name='Caps';
UPDATE players SET nationality='GR' WHERE season IN ('26 LIVE','26WR','26WRs') AND team='G2' AND name='Labrov';
UPDATE players SET nationality='SE' WHERE season IN ('26 LIVE','26WR','26WRs') AND team='KC' AND name='Yike';
UPDATE players SET nationality='PL' WHERE season IN ('26 LIVE','26WR','26WRs') AND (
  (team='KC' AND name='Busio') OR (team='LYON' AND name='Inspired')
);
UPDATE players SET nationality='CA' WHERE season IN ('26 LIVE','26WR','26WRs') AND (
  (team='MKOI' AND name='Jojopyun') OR (team='C9' AND name='Vulcan')
);
UPDATE players SET nationality='AR' WHERE season IN ('26 LIVE','26WR','26WRs') AND team='TLAW' AND name='Josedeodo';
UPDATE players SET nationality='US' WHERE season IN ('26 LIVE','26WR','26WRs') AND (
  (team='TLAW' AND name='Yeon') OR (team='LYON' AND name='Dhokla') OR
  (team='C9' AND name IN ('Blaber','Tactical'))
);
UPDATE players SET nationality='BR' WHERE season IN ('26 LIVE','26WR','26WRs') AND (
  (team='LOS' AND name IN ('Curse','Duduhh','Ackerman')) OR
  (team='FUR' AND name IN ('Guigo','Tatu','Tutsz','Ayu','Jojo'))
);
UPDATE players SET nationality='VN' WHERE season IN ('26 LIVE','26WR','26WRs') AND team='MVK'
  AND name IN ('Kratos','Chika','Harky','SiuLoong');
UPDATE players SET nationality='TW' WHERE season IN ('26 LIVE','26WR','26WRs') AND (
  (team='CFO' AND name IN ('Rest','POUT','Doggo','Kino'))
);
SELECT nationality,COUNT(DISTINCT name) AS players FROM players
  WHERE season='26 LIVE' GROUP BY nationality ORDER BY nationality;
