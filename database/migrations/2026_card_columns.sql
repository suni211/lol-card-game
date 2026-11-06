-- Non-destructive compatibility fix for the 2026 clean-install schema.
-- Necessary for the existing card list, deck and campaign endpoints.
USE lol_card_game;
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS salary INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS laning INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS teamfight INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS macro INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS mental INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS cs_ability INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS lane_pressure INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS damage_dealing INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS survivability INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS objective_control INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS vision_control INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS decision_making INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS consistency INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS other_teams TEXT NULL,
  ADD COLUMN IF NOT EXISTS trait1 VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS trait2 VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS trait3 VARCHAR(50) NULL;
-- Ratings are used for match opportunities; these are neutral card-list defaults,
-- not a direct conversion of overall into health or damage.
