-- Insert Sample Missions
USE lol_card_game;

-- Daily Missions
INSERT INTO missions (title, description, type, requirement, reward) VALUES
('일일 로그인', '게임에 로그인하세요', 'DAILY', 1, 50),
('카드 뽑기', '카드를 3번 뽑으세요', 'DAILY', 3, 100),
('경기 승리', '랭크 경기에서 2번 승리하세요', 'DAILY', 2, 150),
('덱 편성', '덱을 저장하세요', 'DAILY', 1, 50),
('출석 체크', '출석 체크를 완료하세요', 'DAILY', 1, 50);

-- Weekly Missions
INSERT INTO missions (title, description, type, requirement, reward) VALUES
('주간 승리왕', '랭크 경기에서 10번 승리하세요', 'WEEKLY', 10, 500),
('카드 컬렉터', '새로운 카드를 15장 획득하세요', 'WEEKLY', 15, 300),
('덱 마스터', '3가지 다른 덱으로 승리하세요', 'WEEKLY', 3, 400),
('연승 달성', '5연승을 달성하세요', 'WEEKLY', 5, 600),
('트레이드 왕', '다른 유저와 5번 트레이드하세요', 'WEEKLY', 5, 250);
