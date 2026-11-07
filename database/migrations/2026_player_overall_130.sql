-- Expand the player's base OVR limit from 120 to 130.
-- Replaces the old CHECK constraint without touching existing card IDs or values.
-- MariaDB 10.6+ / MySQL 8.0.16+.
USE lol_card_game;

SET @old_overall_check = (
  SELECT tc.CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS tc
  JOIN information_schema.CHECK_CONSTRAINTS cc
    ON cc.CONSTRAINT_SCHEMA=tc.CONSTRAINT_SCHEMA
   AND cc.CONSTRAINT_NAME=tc.CONSTRAINT_NAME
  WHERE tc.TABLE_SCHEMA=DATABASE()
    AND tc.TABLE_NAME='players'
    AND tc.CONSTRAINT_TYPE='CHECK'
    AND LOWER(cc.CHECK_CLAUSE) LIKE '%overall%'
  LIMIT 1
);
SET @drop_sql=IF(
  @old_overall_check IS NULL,'SELECT 1',
  CONCAT('ALTER TABLE players DROP CONSTRAINT `',REPLACE(@old_overall_check,'`','``'),'`')
);
PREPARE drop_overall FROM @drop_sql;
EXECUTE drop_overall;
DEALLOCATE PREPARE drop_overall;

ALTER TABLE players ADD CONSTRAINT chk_player_ovr_50_130
  CHECK (overall >= 50 AND overall <= 130);
SELECT CONSTRAINT_NAME,CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS
 WHERE CONSTRAINT_SCHEMA=DATABASE() AND LOWER(CHECK_CLAUSE) LIKE '%overall%';
