-- User-requested 2026 WRs card balance correction (not real-world statistics).
-- Keep other series and all owned cards unchanged.
USE lol_card_game;
UPDATE players SET overall=90
 WHERE name='Ruler' AND team='GEN.G' AND position='ADC' AND season='26WRs';
UPDATE players SET overall=101
 WHERE name='Chovy' AND team='GEN.G' AND position='MID' AND season='26WRs';
SELECT name,team,position,season,overall FROM players
 WHERE (name='Ruler' OR name='Chovy') AND team='GEN.G' AND season='26WRs';
