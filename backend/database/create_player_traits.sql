-- Clear existing traits
TRUNCATE TABLE player_traits;

-- T1 Players (25WW)
INSERT INTO player_traits (player_id, name, description, effect, trait_type, stat_affected, value_change) VALUES
((SELECT id FROM players WHERE name = '25WW Doran'), '세계 챔피언', '월즈 우승 경험', '+10% 전체 스탯', 'BUFF', 'overall', 10),
((SELECT id FROM players WHERE name = '25WW Doran'), '압박에 강함', '중요한 순간에 강함', '+15 멘탈', 'BUFF', 'mental', 15),
((SELECT id FROM players WHERE name = '25WW Oner'), '정글 지배자', '정글 장악력', '+12 운영', 'BUFF', 'macro', 12),
((SELECT id FROM players WHERE name = '25WW Oner'), '완벽한 타이밍', '갱킹 타이밍', '+10 한타', 'BUFF', 'teamfight', 10),
((SELECT id FROM players WHERE name = '25WW Faker'), 'GOAT', '역대 최고의 선수', '+15% 전체 스탯', 'BUFF', 'overall', 15),
((SELECT id FROM players WHERE name = '25WW Faker'), '불굴의 정신', '절대 포기하지 않음', '+20 멘탈', 'BUFF', 'mental', 20),
((SELECT id FROM players WHERE name = '25WW Faker'), '신의 한 수', '클러치 플레이', '+15 한타', 'BUFF', 'teamfight', 15),
((SELECT id FROM players WHERE name = '25WW Gumayusi'), '완벽한 포지셔닝', '한타 포지셔닝', '+15 한타', 'BUFF', 'teamfight', 15),
((SELECT id FROM players WHERE name = '25WW Gumayusi'), '공격적 성향', '과감한 플레이', '+10 라인전', 'BUFF', 'laning', 10),
((SELECT id FROM players WHERE name = '25WW Gumayusi'), '가끔 실수', '간혹 위험한 플레이', '-5 멘탈', 'NERF', 'mental', -5),
((SELECT id FROM players WHERE name = '25WW Keria'), '로밍 마스터', '완벽한 로밍', '+15 운영', 'BUFF', 'macro', 15),
((SELECT id FROM players WHERE name = '25WW Keria'), '시야 장악', '완벽한 시야 관리', '+12 운영', 'BUFF', 'macro', 12),
((SELECT id FROM players WHERE name = '25WW Keria'), '공격적 서포터', '적극적인 플레이', '+10 한타', 'BUFF', 'teamfight', 10);

-- KT Players (25WUD)
INSERT INTO player_traits (player_id, name, description, effect, trait_type, stat_affected, value_change) VALUES
((SELECT id FROM players WHERE name = '25WUD PerfecT'), '언더독 정신', '약자의 투혼', '+10 멘탈', 'BUFF', 'mental', 10),
((SELECT id FROM players WHERE name = '25WUD PerfecT'), '안정적 라이너', '실수가 적음', '+8 라인전', 'BUFF', 'laning', 8),
((SELECT id FROM players WHERE name = '25WUD PerfecT'), '소극적 플레이', '신중한 성향', '-5 한타', 'NERF', 'teamfight', -5),
((SELECT id FROM players WHERE name = '25WUD Cuzz'), '베테랑 경험', '풍부한 경험', '+10 운영', 'BUFF', 'macro', 10),
((SELECT id FROM players WHERE name = '25WUD Cuzz'), '초반 약세', '초반 압박에 약함', '-8 라인전', 'NERF', 'laning', -8),
((SELECT id FROM players WHERE name = '25WUD Cuzz'), '후반 캐리', '후반 플레이 강화', '+12 한타', 'BUFF', 'teamfight', 12),
((SELECT id FROM players WHERE name = '25WUD Peter'), '침착함', '냉정한 판단', '+12 멘탈', 'BUFF', 'mental', 12),
((SELECT id FROM players WHERE name = '25WUD Peter'), '서포팅 능력', '팀원 지원', '+10 한타', 'BUFF', 'teamfight', 10);

-- CFO Players (25WUD)
INSERT INTO player_traits (player_id, name, description, effect, trait_type, stat_affected, value_change) VALUES
((SELECT id FROM players WHERE name = '25WUD HongQ'), '천재적 센스', '뛰어난 게임 이해도', '+12 운영', 'BUFF', 'macro', 12),
((SELECT id FROM players WHERE name = '25WUD HongQ'), '불안정함', '기복이 심함', '-10 멘탈', 'NERF', 'mental', -10),
((SELECT id FROM players WHERE name = '25WUD HongQ'), '압도적 라인전', '1:1 강함', '+15 라인전', 'BUFF', 'laning', 15),
((SELECT id FROM players WHERE name = '25WUD Doggo'), '딜링 머신', '꾸준한 딜량', '+12 한타', 'BUFF', 'teamfight', 12),
((SELECT id FROM players WHERE name = '25WUD Doggo'), '안정적 성향', '실수 최소화', '+8 멘탈', 'BUFF', 'mental', 8),
((SELECT id FROM players WHERE name = '25WUD Doggo'), '운영 부족', '맵 리딩 약함', '-8 운영', 'NERF', 'macro', -8);

-- LCK REWIND Players (RE)
INSERT INTO player_traits (player_id, name, description, effect, trait_type, stat_affected, value_change) VALUES
((SELECT id FROM players WHERE name = 'RE MaKNooN'), '레전드의 귀환', '전성기 회복', '+10 전체', 'BUFF', 'overall', 10),
((SELECT id FROM players WHERE name = 'RE MaKNooN'), '캐리 성향', '팀을 이끄는 플레이', '+12 한타', 'BUFF', 'teamfight', 12),
((SELECT id FROM players WHERE name = 'RE Ambition'), '완벽한 정글링', '정글 장악', '+15 운영', 'BUFF', 'macro', 15),
((SELECT id FROM players WHERE name = 'RE Ambition'), '냉철한 판단', '정확한 결정', '+12 멘탈', 'BUFF', 'mental', 12),
((SELECT id FROM players WHERE name = 'RE Dade'), '압도적 라인전', '라인 킬 특화', '+18 라인전', 'BUFF', 'laning', 18),
((SELECT id FROM players WHERE name = 'RE Dade'), '대회 징크스', '중요한 대회에서 약함', '-15 멘탈', 'NERF', 'mental', -15),
((SELECT id FROM players WHERE name = 'RE Dade'), '솔로 캐리', '혼자서도 캐리', '+10 한타', 'BUFF', 'teamfight', 10),
((SELECT id FROM players WHERE name = 'RE PraY'), '완벽한 포지셔닝', '죽지 않는 딜러', '+15 한타', 'BUFF', 'teamfight', 15),
((SELECT id FROM players WHERE name = 'RE PraY'), '클러치 유전자', '중요한 순간 강함', '+15 멘탈', 'BUFF', 'mental', 15),
((SELECT id FROM players WHERE name = 'RE MadLife'), '신의 손', '완벽한 스킬샷', '+20 한타', 'BUFF', 'teamfight', 20),
((SELECT id FROM players WHERE name = 'RE MadLife'), '시야 장악', '완벽한 와드', '+18 운영', 'BUFF', 'macro', 18),
((SELECT id FROM players WHERE name = 'RE MadLife'), '레전드 서포터', '역대급 실력', '+15 전체', 'BUFF', 'overall', 15),
((SELECT id FROM players WHERE name = 'RE Flame'), '완벽한 라이너', '라인전 지배자', '+20 라인전', 'BUFF', 'laning', 20),
((SELECT id FROM players WHERE name = 'RE Flame'), '1:1 최강', '듀얼 특화', '+12 라인전', 'BUFF', 'laning', 12),
((SELECT id FROM players WHERE name = 'RE Flame'), '팀플 부족', '개인 플레이 선호', '-10 한타', 'NERF', 'teamfight', -10),
((SELECT id FROM players WHERE name = 'RE Score'), '완벽한 파밍', '끊임없는 성장', '+15 운영', 'BUFF', 'macro', 15),
((SELECT id FROM players WHERE name = 'RE Score'), '안정적 플레이', '실수 없음', '+12 멘탈', 'BUFF', 'mental', 12),
((SELECT id FROM players WHERE name = 'RE Score'), '우승 경험 부족', '결승 약세', '-8 멘탈', 'NERF', 'mental', -8),
((SELECT id FROM players WHERE name = 'RE Faker'), '불멸의 악마왕', '절대자', '+25 전체', 'BUFF', 'overall', 25),
((SELECT id FROM players WHERE name = 'RE Faker'), '완벽한 멘탈', '절대 흔들리지 않음', '+25 멘탈', 'BUFF', 'mental', 25),
((SELECT id FROM players WHERE name = 'RE Faker'), '극한의 캐리', '1대9 가능', '+20 한타', 'BUFF', 'teamfight', 20),
((SELECT id FROM players WHERE name = 'RE Bang'), '안정적 딜러', '꾸준한 딜링', '+15 한타', 'BUFF', 'teamfight', 15),
((SELECT id FROM players WHERE name = 'RE Bang'), '완벽한 라인전', '안정적 성장', '+12 라인전', 'BUFF', 'laning', 12),
((SELECT id FROM players WHERE name = 'RE Bang'), '압박 약세', '중요한 순간 실수', '-10 멘탈', 'NERF', 'mental', -10),
((SELECT id FROM players WHERE name = 'RE Wolf'), '완벽한 호흡', '팀워크 극대화', '+15 운영', 'BUFF', 'macro', 15),
((SELECT id FROM players WHERE name = 'RE Wolf'), '로밍 특화', '맵 장악', '+12 운영', 'BUFF', 'macro', 12),
((SELECT id FROM players WHERE name = 'RE Bengi'), '정글의 신', '완벽한 정글링', '+18 운영', 'BUFF', 'macro', 18),
((SELECT id FROM players WHERE name = 'RE Bengi'), 'Faker의 그림자', '미드와 완벽한 시너지', '+15 한타', 'BUFF', 'teamfight', 15),
((SELECT id FROM players WHERE name = 'RE Bengi'), '라인전 부족', '개인 능력 약함', '-12 라인전', 'NERF', 'laning', -12),
((SELECT id FROM players WHERE name = 'RE Duke'), '탱커 장인', '탱킹 특화', '+15 한타', 'BUFF', 'teamfight', 15),
((SELECT id FROM players WHERE name = 'RE Duke'), '안정적 운영', '실수 최소화', '+12 운영', 'BUFF', 'macro', 12),
((SELECT id FROM players WHERE name = 'RE Duke'), '캐리력 부족', '딜러 챔프 약함', '-10 라인전', 'NERF', 'laning', -10),
((SELECT id FROM players WHERE name = 'RE Smeb'), '완벽한 탑라이너', '모든 면에서 최고', '+20 전체', 'BUFF', 'overall', 20),
((SELECT id FROM players WHERE name = 'RE Smeb'), '캐리 머신', '팀을 이끄는 플레이', '+18 한타', 'BUFF', 'teamfight', 18),
((SELECT id FROM players WHERE name = 'RE Smeb'), '압도적 라인전', '라인전 최강자', '+20 라인전', 'BUFF', 'laning', 20),
((SELECT id FROM players WHERE name = 'RE Peanut'), '공격적 정글', '압박 플레이', '+15 라인전', 'BUFF', 'laning', 15),
((SELECT id FROM players WHERE name = 'RE Peanut'), '초반 강자', '초반 갱킹 특화', '+12 라인전', 'BUFF', 'laning', 12),
((SELECT id FROM players WHERE name = 'RE Peanut'), '후반 약세', '후반 영향력 감소', '-10 한타', 'NERF', 'teamfight', -10);

-- Add more generic traits for common players (선택된 일부 선수들에게만 추가)
-- This is just a sample, you can add more as needed
