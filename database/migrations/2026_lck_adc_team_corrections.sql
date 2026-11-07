-- 2026 LIVE roster corrections requested by the game owner.
-- Idempotent: update only the two incorrectly assigned ADC cards.
-- Preserves player IDs, owned cards, OVR, season, nationality and history.
USE lol_card_game;

UPDATE players SET team='NS'
WHERE name='Diable' AND team='BFX' AND position='ADC' AND season='26 LIVE';

UPDATE players SET team='BFX'
WHERE name='Taeyoon' AND team='NS' AND position='ADC' AND season='26 LIVE';

SELECT id,name,team,position,overall,season
FROM players WHERE name IN ('Diable','Taeyoon') AND season='26 LIVE'
ORDER BY name,id;
