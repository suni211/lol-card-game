-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- BATTLE, COLLECTION, GACHA, SOCIAL, MILESTONE
  difficulty VARCHAR(20) NOT NULL, -- EASY, HARD
  requirement_type VARCHAR(50) NOT NULL, -- total_wins, total_matches, card_count, legendary_count, etc.
  requirement_value INT NOT NULL,
  reward INT NOT NULL, -- Points reward
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements (tracking progress)
CREATE TABLE IF NOT EXISTS user_achievements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  achievement_id INT NOT NULL,
  progress INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  is_claimed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  claimed_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL, -- 1 year from creation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_achievement (user_id, achievement_id, expires_at)
);

-- Insert 50 EASY achievements
INSERT INTO achievements (title, description, category, difficulty, requirement_type, requirement_value, reward) VALUES
-- Battle Easy (15)
('첫 승리', '첫 번째 승리를 달성하세요', 'BATTLE', 'EASY', 'total_wins', 1, 100),
('초보 전사', '10번의 승리를 달성하세요', 'BATTLE', 'EASY', 'total_wins', 10, 200),
('숙련된 파이터', '50번의 승리를 달성하세요', 'BATTLE', 'EASY', 'total_wins', 50, 500),
('첫 AI 승리', 'AI와의 첫 승리를 달성하세요', 'BATTLE', 'EASY', 'ai_wins', 1, 100),
('AI 헌터', 'AI를 10번 격파하세요', 'BATTLE', 'EASY', 'ai_wins', 10, 200),
('랭크 입문', '랭크 게임에서 첫 승리를 달성하세요', 'BATTLE', 'EASY', 'ranked_wins', 1, 150),
('브론즈 정복자', '브론즈 티어에 도달하세요', 'BATTLE', 'EASY', 'reach_tier_bronze', 1, 300),
('실버 도전자', '실버 티어에 도달하세요', 'BATTLE', 'EASY', 'reach_tier_silver', 1, 500),
('골드 승급', '골드 티어에 도달하세요', 'BATTLE', 'EASY', 'reach_tier_gold', 1, 800),
('연승 시작', '2연승을 달성하세요', 'BATTLE', 'EASY', 'win_streak_2', 1, 200),
('배틀 매니아', '총 100경기를 플레이하세요', 'BATTLE', 'EASY', 'total_matches', 100, 500),
('일반전 마스터', '일반전에서 20승을 달성하세요', 'BATTLE', 'EASY', 'practice_wins', 20, 300),
('완벽한 시작', '첫 10경기에서 5승 이상 달성', 'BATTLE', 'EASY', 'first_10_matches_5wins', 1, 500),
('끈기의 전사', '연속으로 5경기 플레이', 'BATTLE', 'EASY', 'consecutive_matches_5', 1, 200),
('주말 전사', '주말에 10경기 플레이', 'BATTLE', 'EASY', 'weekend_matches_10', 1, 300),

-- Collection Easy (15)
('첫 카드', '첫 번째 카드를 획득하세요', 'COLLECTION', 'EASY', 'card_count', 1, 100),
('카드 수집가', '10장의 카드를 수집하세요', 'COLLECTION', 'EASY', 'card_count', 10, 200),
('작은 컬렉션', '30장의 카드를 수집하세요', 'COLLECTION', 'EASY', 'card_count', 30, 400),
('중급 컬렉터', '50장의 카드를 수집하세요', 'COLLECTION', 'EASY', 'card_count', 50, 600),
('레어 헌터', '레어 카드 5장 획득', 'COLLECTION', 'EASY', 'rare_count', 5, 300),
('에픽 시작', '첫 에픽 카드 획득', 'COLLECTION', 'EASY', 'epic_count', 1, 400),
('레전드 입문', '첫 레전드 카드 획득', 'COLLECTION', 'EASY', 'legendary_count', 1, 800),
('TOP 라이너', 'TOP 포지션 카드 5장 수집', 'COLLECTION', 'EASY', 'position_top_count', 5, 200),
('정글러', 'JUNGLE 포지션 카드 5장 수집', 'COLLECTION', 'EASY', 'position_jungle_count', 5, 200),
('미드 라이너', 'MID 포지션 카드 5장 수집', 'COLLECTION', 'EASY', 'position_mid_count', 5, 200),
('원딜러', 'ADC 포지션 카드 5장 수집', 'COLLECTION', 'EASY', 'position_adc_count', 5, 200),
('서포터', 'SUPPORT 포지션 카드 5장 수집', 'COLLECTION', 'EASY', 'position_support_count', 5, 200),
('LCK 팬', 'LCK 카드 10장 수집', 'COLLECTION', 'EASY', 'region_lck_count', 10, 300),
('T1 팬', 'T1 팀 카드 3장 수집', 'COLLECTION', 'EASY', 'team_t1_count', 3, 250),
('카드 강화 시작', '카드 1장을 레벨 5로 강화', 'COLLECTION', 'EASY', 'card_level_5', 1, 300),

-- Gacha Easy (10)
('운을 시험하다', '첫 가챠를 뽑으세요', 'GACHA', 'EASY', 'gacha_count', 1, 100),
('가챠 입문', '10번 가챠를 뽑으세요', 'GACHA', 'EASY', 'gacha_count', 10, 300),
('가챠 중독', '50번 가챠를 뽑으세요', 'GACHA', 'EASY', 'gacha_count', 50, 600),
('프리미엄 맛보기', '프리미엄 가챠 첫 구매', 'GACHA', 'EASY', 'premium_gacha_count', 1, 200),
('울트라 도전', '울트라 가챠 첫 구매', 'GACHA', 'EASY', 'ultra_gacha_count', 1, 300),
('행운의 시작', '가챠에서 에픽 이상 획득', 'GACHA', 'EASY', 'gacha_epic_plus', 1, 400),
('대박!', '가챠에서 레전드 획득', 'GACHA', 'EASY', 'gacha_legendary', 1, 800),
('무료 가챠 마스터', '무료 가챠 20회 사용', 'GACHA', 'EASY', 'free_gacha_count', 20, 400),
('합성 입문', '첫 카드 합성 완료', 'GACHA', 'EASY', 'fusion_count', 1, 200),
('합성 장인', '카드 합성 10회 완료', 'GACHA', 'EASY', 'fusion_count', 10, 500),

-- Social & Milestone Easy (10)
('신규 유저 환영', '계정 생성 완료', 'MILESTONE', 'EASY', 'account_created', 1, 500),
('첫 출석', '첫 일일 출석 완료', 'MILESTONE', 'EASY', 'daily_login_count', 1, 100),
('꾸준함의 시작', '3일 연속 출석', 'MILESTONE', 'EASY', 'consecutive_login_3', 1, 200),
('일주일 도전', '7일 연속 출석', 'MILESTONE', 'EASY', 'consecutive_login_7', 1, 500),
('부자의 시작', '1000 포인트 보유', 'MILESTONE', 'EASY', 'points_owned_1000', 1, 200),
('포인트 수집가', '5000 포인트 보유', 'MILESTONE', 'EASY', 'points_owned_5000', 1, 500),
('첫 미션 완료', '미션 1개 완료', 'MILESTONE', 'EASY', 'mission_completed_count', 1, 150),
('미션 마스터', '미션 10개 완료', 'MILESTONE', 'EASY', 'mission_completed_count', 10, 500),
('덱 빌더 입문', '첫 덱 구성 완료', 'MILESTONE', 'EASY', 'deck_created', 1, 200),
('프로필 완성', '프로필 정보 업데이트', 'MILESTONE', 'EASY', 'profile_updated', 1, 100);

-- Insert 30 HARD achievements
INSERT INTO achievements (title, description, category, difficulty, requirement_type, requirement_value, reward) VALUES
-- Battle Hard (12)
('전쟁의 신', '500번의 승리를 달성하세요', 'BATTLE', 'HARD', 'total_wins', 500, 5000),
('불패의 전설', '1000번의 승리를 달성하세요', 'BATTLE', 'HARD', 'total_wins', 1000, 15000),
('플레티넘 달성', '플레티넘 티어에 도달하세요', 'BATTLE', 'HARD', 'reach_tier_platinum', 1, 3000),
('다이아 정복', '다이아 티어에 도달하세요', 'BATTLE', 'HARD', 'reach_tier_diamond', 1, 5000),
('마스터 승급', '마스터 티어에 도달하세요', 'BATTLE', 'HARD', 'reach_tier_master', 1, 8000),
('그랜드마스터', '그랜드마스터 티어에 도달하세요', 'BATTLE', 'HARD', 'reach_tier_grandmaster', 1, 12000),
('챌린저 등극', '챌린저 티어에 도달하세요', 'BATTLE', 'HARD', 'reach_tier_challenger', 1, 20000),
('연승 행진', '10연승을 달성하세요', 'BATTLE', 'HARD', 'win_streak_10', 1, 3000),
('압도적 승리', '20연승을 달성하세요', 'BATTLE', 'HARD', 'win_streak_20', 1, 8000),
('AI 정복자', 'AI를 100번 격파하세요', 'BATTLE', 'HARD', 'ai_wins', 100, 2000),
('랭크 마스터', '랭크 게임 100승 달성', 'BATTLE', 'HARD', 'ranked_wins', 100, 3000),
('베테랑', '총 1000경기 플레이', 'BATTLE', 'HARD', 'total_matches', 1000, 5000),

-- Collection Hard (8)
('진정한 컬렉터', '200장의 카드 수집', 'COLLECTION', 'HARD', 'card_count', 200, 3000),
('컬렉션 마스터', '500장의 카드 수집', 'COLLECTION', 'HARD', 'card_count', 500, 10000),
('에픽 컬렉터', '에픽 카드 20장 수집', 'COLLECTION', 'HARD', 'epic_count', 20, 3000),
('레전드 컬렉터', '레전드 카드 10장 수집', 'COLLECTION', 'HARD', 'legendary_count', 10, 5000),
('완벽한 팀', '한 팀의 카드 전부 수집 (5포지션)', 'COLLECTION', 'HARD', 'complete_team', 1, 4000),
('카드 마스터', '카드 1장을 최대 레벨(20)로 강화', 'COLLECTION', 'HARD', 'card_level_20', 1, 3000),
('전 포지션 마스터', '각 포지션별 레어 이상 10장씩 수집', 'COLLECTION', 'HARD', 'all_positions_10_rare', 1, 5000),
('레전드 덱', '레전드 카드로만 이루어진 덱 구성', 'COLLECTION', 'HARD', 'legendary_deck', 1, 8000),

-- Gacha Hard (5)
('가챠 광', '500번 가챠 뽑기', 'GACHA', 'HARD', 'gacha_count', 500, 5000),
('월즈 챔피언십', '월즈 우승 가챠 10회 구매', 'GACHA', 'HARD', 'worlds_gacha_count', 10, 3000),
('합성 마스터', '카드 합성 100회 완료', 'GACHA', 'HARD', 'fusion_count', 100, 3000),
('황금 손', '합성으로 레전드 카드 5장 획득', 'GACHA', 'HARD', 'fusion_legendary_count', 5, 5000),
('레전드 헌터', '가챠에서 레전드 카드 20장 획득', 'GACHA', 'HARD', 'gacha_legendary_count', 20, 8000),

-- Milestone Hard (5)
('한 달의 헌신', '30일 연속 출석', 'MILESTONE', 'HARD', 'consecutive_login_30', 1, 3000),
('불굴의 의지', '100일 연속 출석', 'MILESTONE', 'HARD', 'consecutive_login_100', 1, 10000),
('1년의 여정', '365일 연속 출석', 'MILESTONE', 'HARD', 'consecutive_login_365', 1, 50000),
('부의 축적', '100000 포인트 보유', 'MILESTONE', 'HARD', 'points_owned_100000', 1, 5000),
('미션 올클리어', '모든 미션 타입 각 100개씩 완료', 'MILESTONE', 'HARD', 'all_mission_types_100', 1, 10000);
