-- Add Life (support) and Sharvel (jungle) to DN SOOPers 26 LIVE cards.
-- Safe to rerun. Existing players, cards, boosts, decks and histories are kept.
-- OVR 77 is the DNS 26 LIVE provisional baseline used by the current roster seed.
-- Requires players.nationality from database/migrations/2026_iso_country_codes.sql.
USE lol_card_game;

INSERT INTO players
  (name,team,position,overall,region,tier,season,nationality)
SELECT 'Sharvel','DNS','JUNGLE',77,'LCK','COMMON','26 LIVE','KR'
WHERE NOT EXISTS (
  SELECT 1 FROM players
  WHERE name='Sharvel' AND team='DNS'
    AND position='JUNGLE' AND season='26 LIVE'
);

INSERT INTO players
  (name,team,position,overall,region,tier,season,nationality)
SELECT 'Life','DNS','SUPPORT',77,'LCK','COMMON','26 LIVE','KR'
WHERE NOT EXISTS (
  SELECT 1 FROM players
  WHERE name='Life' AND team='DNS'
    AND position='SUPPORT' AND season='26 LIVE'
);

-- Fill only unassigned flags, without overriding admin changes.
UPDATE players SET nationality='KR'
WHERE team='DNS' AND season='26 LIVE'
  AND ((name='Sharvel' AND position='JUNGLE') OR
       (name='Life' AND position='SUPPORT'))
  AND (nationality IS NULL OR nationality='');

SELECT id,name,team,position,overall,season,nationality
FROM players WHERE team='DNS' AND season='26 LIVE'
ORDER BY FIELD(position,'TOP','JUNGLE','MID','ADC','SUPPORT'),name,id;
