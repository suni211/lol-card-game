-- Extend player base OVR to 160 without deleting or resetting cards.
-- Run with sudo mariadb < this-file. Safe to rerun.
USE lol_card_game;

DROP PROCEDURE IF EXISTS lcg_expand_ovr_160;
DELIMITER $$
CREATE PROCEDURE lcg_expand_ovr_160()
BEGIN
  DECLARE finished INT DEFAULT 0;
  DECLARE constraint_name VARCHAR(128);
  DECLARE old_checks CURSOR FOR
    SELECT tc.CONSTRAINT_NAME
    FROM information_schema.TABLE_CONSTRAINTS tc
    JOIN information_schema.CHECK_CONSTRAINTS cc
      ON cc.CONSTRAINT_SCHEMA=tc.CONSTRAINT_SCHEMA
     AND cc.CONSTRAINT_NAME=tc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA=DATABASE()
      AND tc.TABLE_NAME='players'
      AND tc.CONSTRAINT_TYPE='CHECK'
      AND LOWER(cc.CHECK_CLAUSE) LIKE '%overall%';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET finished=1;

  OPEN old_checks;
  checks_loop: LOOP
    FETCH old_checks INTO constraint_name;
    IF finished=1 THEN LEAVE checks_loop; END IF;
    SET @ddl=CONCAT('ALTER TABLE players DROP CONSTRAINT `',
      REPLACE(constraint_name,'`','``'),'`');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END LOOP;
  CLOSE old_checks;

  ALTER TABLE players ADD CONSTRAINT chk_player_ovr_50_160
    CHECK (overall >= 50 AND overall <= 160);
END$$
DELIMITER ;

CALL lcg_expand_ovr_160();
DROP PROCEDURE lcg_expand_ovr_160;

SELECT tc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
FROM information_schema.TABLE_CONSTRAINTS tc
JOIN information_schema.CHECK_CONSTRAINTS cc
  ON cc.CONSTRAINT_SCHEMA=tc.CONSTRAINT_SCHEMA
 AND cc.CONSTRAINT_NAME=tc.CONSTRAINT_NAME
WHERE tc.TABLE_SCHEMA=DATABASE() AND tc.TABLE_NAME='players'
  AND LOWER(cc.CHECK_CLAUSE) LIKE '%overall%';
