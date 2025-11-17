-- Remove tier column from players table
-- Tier will now be calculated dynamically based on overall rating:
-- 1-80: COMMON
-- 81-90: RARE
-- 91-100: EPIC
-- 101+: LEGENDARY

USE lol_card_game;

ALTER TABLE players DROP COLUMN tier;
