-- 전략 밸런스 시스템

-- 1. 전략 밸런스 테이블 (각 전략의 현재 밸런스 수치)
CREATE TABLE IF NOT EXISTS strategy_balance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    strategy_type ENUM('LANING', 'TEAMFIGHT', 'MACRO') NOT NULL,
    strategy_name VARCHAR(50) NOT NULL,
    balance_modifier DECIMAL(4,3) DEFAULT 1.000, -- 1.000 = 기본, 1.100 = 10% 버프, 0.900 = 10% 너프
    usage_count INT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    last_balanced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_strategy (strategy_type, strategy_name),
    INDEX idx_strategy_type (strategy_type),
    INDEX idx_usage_count (usage_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 전략 밸런스 히스토리 (밸런스 변경 기록)
CREATE TABLE IF NOT EXISTS strategy_balance_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    strategy_type ENUM('LANING', 'TEAMFIGHT', 'MACRO') NOT NULL,
    strategy_name VARCHAR(50) NOT NULL,
    old_modifier DECIMAL(4,3) NOT NULL,
    new_modifier DECIMAL(4,3) NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_strategy (strategy_type, strategy_name),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 초기 전략 데이터 삽입
INSERT INTO strategy_balance (strategy_type, strategy_name, balance_modifier) VALUES
-- Laning Strategies
('LANING', 'AGGRESSIVE', 1.000),
('LANING', 'SAFE', 1.000),
('LANING', 'ROAMING', 1.000),
('LANING', 'SCALING', 1.000),
('LANING', 'PUSH', 1.000),
('LANING', 'FREEZE', 1.000),
('LANING', 'TRADE', 1.000),
('LANING', 'ALLKILL', 1.000),
-- Teamfight Strategies
('TEAMFIGHT', 'ENGAGE', 1.000),
('TEAMFIGHT', 'DISENGAGE', 1.000),
('TEAMFIGHT', 'POKE', 1.000),
('TEAMFIGHT', 'PROTECT', 1.000),
('TEAMFIGHT', 'SPLIT', 1.000),
('TEAMFIGHT', 'FLANK', 1.000),
('TEAMFIGHT', 'KITE', 1.000),
('TEAMFIGHT', 'DIVE', 1.000),
-- Macro Strategies
('MACRO', 'OBJECTIVE', 1.000),
('MACRO', 'VISION', 1.000),
('MACRO', 'SPLITPUSH', 1.000),
('MACRO', 'GROUPING', 1.000),
('MACRO', 'PICK', 1.000),
('MACRO', 'SIEGE', 1.000),
('MACRO', 'ROTATION', 1.000),
('MACRO', 'CONTROL', 1.000)
ON DUPLICATE KEY UPDATE balance_modifier = balance_modifier;
