-- Manual ISO nationality assignment for 2026 player cards.
-- Additive migration: no nationality is guessed, changed, or reset.
-- Run this instead of scripts that automatically assign a subset of countries.
USE lol_card_game;
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS nationality CHAR(2) NULL DEFAULT NULL;
SELECT COUNT(*) AS unassigned_nationality_cards
  FROM players WHERE nationality IS NULL OR nationality = '';
