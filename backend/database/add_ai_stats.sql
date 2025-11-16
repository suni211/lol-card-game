-- Add AI wins and losses columns to user_stats table
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS ai_wins INT DEFAULT 0 COMMENT 'AI 배틀 승리 횟수',
ADD COLUMN IF NOT EXISTS ai_losses INT DEFAULT 0 COMMENT 'AI 배틀 패배 횟수';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_stats_ai ON user_stats(user_id, ai_wins, ai_losses);
