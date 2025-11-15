-- Add detailed stats to players table
ALTER TABLE players
ADD COLUMN laning INT DEFAULT 50 COMMENT 'Laning phase skill (0-100)',
ADD COLUMN teamfight INT DEFAULT 50 COMMENT 'Teamfight skill (0-100)',
ADD COLUMN macro INT DEFAULT 50 COMMENT 'Macro/strategy skill (0-100)',
ADD COLUMN mental INT DEFAULT 50 COMMENT 'Mental strength/clutch factor (0-100)';

-- Create strategies table
CREATE TABLE IF NOT EXISTS strategies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  laning_weight DECIMAL(3,2) DEFAULT 1.0,
  teamfight_weight DECIMAL(3,2) DEFAULT 1.0,
  macro_weight DECIMAL(3,2) DEFAULT 1.0,
  mental_weight DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default strategies
INSERT INTO strategies (name, description, laning_weight, teamfight_weight, macro_weight, mental_weight) VALUES
('균형', '모든 요소를 균형있게 활용합니다', 1.0, 1.0, 1.0, 1.0),
('라인 압박', '라인전에 집중하여 초반 우위를 가져갑니다', 1.5, 0.8, 0.9, 1.0),
('한타 중심', '한타에서의 승리에 집중합니다', 0.8, 1.5, 0.9, 1.1),
('운영 중심', '맵 장악과 오브젝트 운영에 집중합니다', 0.9, 0.9, 1.5, 1.0),
('정신력 중심', '압박 상황에서의 플레이에 집중합니다', 0.9, 1.0, 0.9, 1.4),
('올인', '모든 것을 걸고 승부합니다', 1.2, 1.2, 0.7, 1.3),
('안정 운영', '안정적인 플레이로 실수를 최소화합니다', 0.9, 0.9, 1.3, 1.2);

-- Create deck strategies table (user's strategy choice per deck)
CREATE TABLE IF NOT EXISTS deck_strategies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deck_id INT NOT NULL,
  strategy_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE,
  UNIQUE KEY unique_deck_strategy (deck_id)
);

-- Update player_traits table structure to include buff/nerf type
ALTER TABLE player_traits
ADD COLUMN trait_type VARCHAR(20) DEFAULT 'BUFF' COMMENT 'BUFF or NERF',
ADD COLUMN stat_affected VARCHAR(20) COMMENT 'laning, teamfight, macro, mental, or overall',
ADD COLUMN value_change INT DEFAULT 0 COMMENT 'Positive for buffs, negative for nerfs';
