-- Add season field to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS season VARCHAR(20) DEFAULT NULL AFTER region;

-- Update existing players with season info based on name
UPDATE players SET season = '25WW' WHERE name LIKE '25WW%';
UPDATE players SET season = '25WUD' WHERE name LIKE '25WUD%';
UPDATE players SET season = '24WW' WHERE name LIKE '24WW%';
UPDATE players SET season = '24WUD' WHERE name LIKE '24WUD%';

-- For players without season prefix, set to 25 (current season)
UPDATE players SET season = '25' WHERE season IS NULL;
