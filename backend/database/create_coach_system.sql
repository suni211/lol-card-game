-- 코치 시스템

-- 코치 테이블
CREATE TABLE IF NOT EXISTS coaches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    star_rating INT NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
    buff_type ENUM('OVERALL', 'POSITION', 'TEAM', 'STRATEGY') NOT NULL,
    buff_value INT NOT NULL,
    buff_target VARCHAR(50), -- POSITION: 'TOP', 'JUN', 'MID', 'ADC', 'SUP', TEAM: 'T1', 'DK' etc
    description TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 유저 코치 소유 테이블
CREATE TABLE IF NOT EXISTS user_coaches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    coach_id INT NOT NULL,
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_coach_id (coach_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 코치 데이터 삽입 (한국 이름, 30명, 1~5성)
INSERT INTO coaches (name, star_rating, buff_type, buff_value, buff_target, description) VALUES
-- 5성 코치 (3명)
('김철수', 5, 'OVERALL', 10, NULL, '전체 선수 오버롤 +10'),
('이영희', 5, 'TEAM', 15, 'T1', 'T1 팀 선수 오버롤 +15'),
('박민수', 5, 'STRATEGY', 20, NULL, '전략 승률 +20%'),

-- 4성 코치 (7명)
('최동욱', 4, 'OVERALL', 7, NULL, '전체 선수 오버롤 +7'),
('정수진', 4, 'POSITION', 12, 'MID', '미드 선수 오버롤 +12'),
('강태양', 4, 'POSITION', 12, 'ADC', 'ADC 선수 오버롤 +12'),
('송지훈', 4, 'TEAM', 12, 'DK', 'DK 팀 선수 오버롤 +12'),
('윤서연', 4, 'POSITION', 12, 'JUN', '정글 선수 오버롤 +12'),
('한민재', 4, 'TEAM', 12, 'GEN', 'GEN 팀 선수 오버롤 +12'),
('오상민', 4, 'STRATEGY', 15, NULL, '전략 승률 +15%'),

-- 3성 코치 (10명)
('배준호', 3, 'OVERALL', 5, NULL, '전체 선수 오버롤 +5'),
('임지우', 3, 'POSITION', 8, 'TOP', '탑 선수 오버롤 +8'),
('서하늘', 3, 'POSITION', 8, 'SUP', '서포터 선수 오버롤 +8'),
('노현우', 3, 'TEAM', 8, 'HLE', 'HLE 팀 선수 오버롤 +8'),
('황다은', 3, 'POSITION', 8, 'MID', '미드 선수 오버롤 +8'),
('안재민', 3, 'TEAM', 8, 'KT', 'KT 팀 선수 오버롤 +8'),
('문소희', 3, 'POSITION', 8, 'ADC', 'ADC 선수 오버롤 +8'),
('신동혁', 3, 'TEAM', 8, 'LSB', 'LSB 팀 선수 오버롤 +8'),
('류지성', 3, 'STRATEGY', 10, NULL, '전략 승률 +10%'),
('곽은비', 3, 'POSITION', 8, 'JUN', '정글 선수 오버롤 +8'),

-- 2성 코치 (7명)
('진수아', 2, 'OVERALL', 3, NULL, '전체 선수 오버롤 +3'),
('허준영', 2, 'POSITION', 5, 'TOP', '탑 선수 오버롤 +5'),
('남궁민', 2, 'POSITION', 5, 'MID', '미드 선수 오버롤 +5'),
('전하린', 2, 'TEAM', 5, 'NS', 'NS 팀 선수 오버롤 +5'),
('표정우', 2, 'POSITION', 5, 'SUP', '서포터 선수 오버롤 +5'),
('권나영', 2, 'STRATEGY', 7, NULL, '전략 승률 +7%'),
('홍석진', 2, 'POSITION', 5, 'ADC', 'ADC 선수 오버롤 +5'),

-- 1성 코치 (3명)
('구민호', 1, 'OVERALL', 1, NULL, '전체 선수 오버롤 +1'),
('설아름', 1, 'POSITION', 3, 'JUN', '정글 선수 오버롤 +3'),
('탁준서', 1, 'STRATEGY', 3, NULL, '전략 승률 +3%');
