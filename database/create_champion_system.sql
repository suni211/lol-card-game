-- 챔피언 및 스킬 시스템 테이블

-- 챔피언 테이블
CREATE TABLE IF NOT EXISTS champions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  skill_name VARCHAR(100) NOT NULL,
  skill_description TEXT NOT NULL,
  cooldown INT NOT NULL DEFAULT 3,
  scaling_type ENUM('AD', 'AP') NOT NULL DEFAULT 'AD',
  champion_class ENUM('TANK', 'BRUISER', 'ASSASSIN', 'DEALER', 'RANGED_DEALER', 'RANGED_AP', 'SUPPORT') NOT NULL,

  -- Skill values at level 6/12/18
  value_level1 INT DEFAULT 0,
  value_level2 INT DEFAULT 0,
  value_level3 INT DEFAULT 0,

  -- Extra parameters for complex skills
  extra_param1 INT DEFAULT 0,
  extra_param2 INT DEFAULT 0,
  extra_param3 INT DEFAULT 0,

  is_one_time BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 24 챔피언 데이터 삽입
INSERT INTO champions (name, skill_name, skill_description, cooldown, scaling_type, champion_class, value_level1, value_level2, value_level3, extra_param1, extra_param2, extra_param3, is_one_time) VALUES

-- 탱커/브루저
('몽크', '지혜', '스킬 사용시, 전 인원에게 보호막을 줌', 5, 'AD', 'TANK', 300, 600, 900, 0, 0, 0, FALSE),
('데니스', '참수', '망치를 이용해 한타 때 스킬 발동 시, N명에게 CC기', 7, 'AD', 'BRUISER', 1, 3, 5, 0, 0, 0, FALSE),
('리리스', '데롱데롱', '상대에게 수면 적중시 (30%확률로) N% 데미지가 겹쳐서 들어감', 3, 'AP', 'BRUISER', 200, 300, 400, 30, 0, 0, FALSE),
('볼리베스', '아 볼리베스,,,', '스킬 사용시, 잃은 체력 N% 비례해서 피회복', 4, 'AD', 'TANK', 10, 20, 30, 0, 0, 0, FALSE),
('징쉰차오', '짜장배달', '모든 라인에 영향을 끼칠 수 있음', 2, 'AD', 'BRUISER', 100, 150, 200, 0, 0, 0, FALSE),

-- 탱커/암살자
('뽀뽀', '괴롭히기', '상대방 한명을 지정해, N% 확률로 N턴동안 다른 라인으로 못가게 함', 3, 'AD', 'TANK', 10, 20, 30, 1, 2, 3, FALSE),
('바미르', '시야잠수', '상대에게 CC기를 검. 랜덤하게 1명은 아무런 행동을 하지 못함', 4, 'AD', 'ASSASSIN', 1, 1, 1, 0, 0, 0, FALSE),
('엘리제', '띠리리', '상대방에게 공포를 검, 확정CC이며 1명에게 지정, 강제 귀환', 5, 'AD', 'ASSASSIN', 1, 1, 1, 0, 0, 0, FALSE),
('베르베르', '다른 세계관', '사용시, 공격력이 체력 N% 비례해서 증가함', 2, 'AD', 'DEALER', 5, 10, 15, 0, 0, 0, FALSE),
('추엉구엥', '오리덥석', '모두가 변이당함, 우리팀은 보호막, 상대는 스킬 사용 불가', 3, 'AP', 'DEALER', 5, 5, 5, 0, 0, 0, FALSE),

-- 딜러
('리딩스쿼시', '멍청이', '스킬 사용시 공격력이 N% 증가함 (자동 타겟팅)', 2, 'AD', 'DEALER', 30, 40, 50, 0, 0, 0, FALSE),
('주', '부활', '쿨타임이 돌때마다, 턴 무시하고 바로 부활', 5, 'AP', 'DEALER', 100, 100, 100, 0, 0, 0, FALSE),
('비르레인', '니 스킬 내꺼다', '상대방이 스킬 사용 시, 역으로 스킬을 뺏어 랜덤하게 사용', 3, 'AP', 'BRUISER', 1, 1, 1, 0, 0, 0, FALSE),
('재헌', '아 시발, 난 싫어.', '상대방에 AD가 있을 시, AP 딜이 N% 증가함', 2, 'AP', 'DEALER', 3, 5, 10, 0, 0, 0, FALSE),
('쟌슨', '어어, 가기싫어요.', '스킬 사용시, 한타 때 상대방 전원 귀환', 15, 'AP', 'DEALER', 1, 1, 1, 0, 0, 0, FALSE),

-- 원거리 딜러
('코멜', '땅땅땅빵', '데미지가 고정적으로 모두에게 들어감', 4, 'AD', 'RANGED_DEALER', 4, 44, 444, 0, 0, 0, FALSE),
('하균', '쓰로잉', '50% 확률로 적에게 N딜, 50% 확률로 팀에게 N딜', 3, 'AD', 'RANGED_DEALER', 300, 500, 1000, 200, 400, 800, FALSE),
('다르미난', '피 존나맛있노', '공격력 비례 N% 확률로 상대방 전원에게 피흡 (고정딜)', 4, 'AD', 'RANGED_DEALER', 10, 20, 30, 300, 400, 500, FALSE),
('쨔스', '아 이거 터집니다~', '한타 때 3~5명에게 AP 비례 N% 마법 딜', 3, 'AP', 'RANGED_AP', 100, 200, 300, 3, 5, 0, FALSE),
('체스터', '떙큐', 'N% 확률로 상대방에게 N 골드를 강탈', 1, 'AD', 'RANGED_DEALER', 10, 20, 30, 300, 600, 900, FALSE),

-- 서포터
('토마', '세르피셀의 지팡이', 'AP 비례 N% 보호막이 원거리 딜러에게 생김', 3, 'AP', 'SUPPORT', 100, 300, 500, 0, 0, 0, FALSE),
('참치', '싱싱불어라', '1~5명 상대에게 CC, 우리팀에게 AP 비례 N% 공격력 버프', 3, 'AP', 'SUPPORT', 10, 20, 30, 1, 5, 0, FALSE),
('미지온', 'THINK', '한턴 휴식 후 다음턴에 공격력 N을 영구 부여', 2, 'AD', 'SUPPORT', 10, 20, 30, 0, 0, 0, FALSE),
('김승진', '아, 하고싶다.', '상대 원딜에게 N턴동안 전담마크, 딜 N을 영구적으로 깎음', 99, 'AD', 'TANK', 1, 2, 3, 5, 10, 13, TRUE);

-- 인덱스 생성
CREATE INDEX idx_champions_class ON champions(champion_class);
CREATE INDEX idx_champions_scaling ON champions(scaling_type);

-- 결과 확인
SELECT id, name, skill_name, cooldown, scaling_type, champion_class FROM champions ORDER BY id;
