-- Add streak columns to user_stats table

ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0 AFTER losses,
ADD COLUMN IF NOT EXISTS longest_win_streak INT DEFAULT 0 AFTER current_streak;

-- Update existing rows to have default values
UPDATE user_stats SET current_streak = 0 WHERE current_streak IS NULL;
UPDATE user_stats SET longest_win_streak = 0 WHERE longest_win_streak IS NULL;
