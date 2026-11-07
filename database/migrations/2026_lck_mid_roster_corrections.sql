-- 2026 LIVE: Loki is C9 MID, Roamer is BRO MID.
-- Safe for existing owned cards: keep player IDs, levels, OVR and history.
-- The C9 Loki card was already seeded in 2026_live_worlds.sql.
USE lol_card_game;

-- Correct ALL mislabeled BRO MID cards in place. This still works if a
-- Roamer record was inserted previously; never leave a BRO Loki behind.
-- Keep each ID so existing card inventories and histories remain valid.
UPDATE players
SET name='Roamer',image_url=NULL
WHERE name='Loki' AND team='BRO'
  AND position='MID' AND season='26 LIVE';

-- Also work on databases whose original 2026 seed was never installed.
INSERT INTO players
  (name,team,position,overall,region,tier,season)
SELECT 'Roamer','BRO','MID',71,'LCK','COMMON','26 LIVE'
WHERE NOT EXISTS (
  SELECT 1 FROM players
  WHERE name='Roamer' AND team='BRO'
    AND position='MID' AND season='26 LIVE'
);

INSERT INTO players
  (name,team,position,overall,region,tier,season)
SELECT 'Loki','C9','MID',74,'LCS','COMMON','26 LIVE'
WHERE NOT EXISTS (
  SELECT 1 FROM players
  WHERE name='Loki' AND team='C9'
    AND position='MID' AND season='26 LIVE'
);

-- Both players are South Korean; do not overwrite any manually set code.
UPDATE players SET nationality='KR'
WHERE name IN ('Roamer','Loki')
  AND ((name='Roamer' AND team='BRO') OR (name='Loki' AND team='C9'))
  AND (nationality IS NULL OR nationality='');

-- Verification: BRO should have Roamer MID and C9 should have Loki MID.
SELECT id,name,team,position,season,overall,nationality
FROM players
WHERE season='26 LIVE'
  AND (name='Roamer' OR name='Loki')
ORDER BY team,name,id;

-- In databases with an already seeded Roamer and an old BRO Loki card,
-- both IDs may now display Roamer. They are retained to protect ownership;
-- this migration does not delete or merge player/card records.
