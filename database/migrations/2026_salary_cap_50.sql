-- Rebalance all player salaries under the 50-point deck cap.
-- Run after the existing roster/salary-column migrations, ideally after 12WR.
-- Safe: touches only players.salary; leaves OVR, owned cards and decks unchanged.
-- For 26WRs, use the base OVR, not a temporary live boost, for salary.
USE lol_card_game;
UPDATE players p
LEFT JOIN worlds2026_live_boosts b ON b.player_id=p.id
SET p.salary = CASE
 WHEN (p.overall-IF(p.season='26WRs',COALESCE(b.boost_amount,0),0))<=74 THEN 5
 WHEN (p.overall-IF(p.season='26WRs',COALESCE(b.boost_amount,0),0))<=79 THEN 6
 WHEN (p.overall-IF(p.season='26WRs',COALESCE(b.boost_amount,0),0))<=84 THEN 8
 WHEN (p.overall-IF(p.season='26WRs',COALESCE(b.boost_amount,0),0))<=89 THEN 10
 WHEN (p.overall-IF(p.season='26WRs',COALESCE(b.boost_amount,0),0))<=94 THEN 12
 WHEN (p.overall-IF(p.season='26WRs',COALESCE(b.boost_amount,0),0))<=99 THEN 14
 WHEN (p.overall-IF(p.season='26WRs',COALESCE(b.boost_amount,0),0))<=104 THEN 16
 WHEN (p.overall-IF(p.season='26WRs',COALESCE(b.boost_amount,0),0))<=109 THEN 17
 WHEN (p.overall-IF(p.season='26WRs',COALESCE(b.boost_amount,0),0))<=119 THEN 19
 WHEN (p.overall-IF(p.season='26WRs',COALESCE(b.boost_amount,0),0))<=129 THEN 20
 ELSE 22 END;
SELECT salary,COUNT(*) AS player_cards FROM players GROUP BY salary ORDER BY salary;
