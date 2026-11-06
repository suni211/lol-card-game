-- Applies to a NEW installation only, after schema.sql + 2026 migrations.
-- Legacy tables/game modes remain available, but the active card pool is
-- STRICTLY the three 2026 series.
USE lol_card_game;

-- Original schema.sql contains historical Worlds seeds and reward definitions.
-- Remove stale coupons referring to those players before deleting cards.
UPDATE coupons SET reward_player_id=NULL WHERE reward_player_id IS NOT NULL;

-- Historical championships and older player versions are not part of the
-- freshly relaunched 2026 game. Cascading tables (traits, stats, prices)
-- are deleted by their foreign keys.
DELETE FROM players
WHERE season IS NULL OR season NOT IN ('26 LIVE','26WR','26WRs');

-- The original schema seeds legacy pack definitions. They are not part of the
-- 2026 launch. Application gacha routes already filter to new seasons only.
DELETE FROM gacha_packs;

SELECT season,COUNT(*) AS cards FROM players
GROUP BY season ORDER BY season;
SELECT COUNT(*) AS new_accounts FROM users;
SELECT COUNT(*) AS existing_owned_cards FROM user_cards;
