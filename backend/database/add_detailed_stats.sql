-- 선수 세부 스탯 8개 추가
-- 기존: laning, teamfight, macro, mental (4개)
-- 추가: cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency (8개)

ALTER TABLE players
ADD COLUMN IF NOT EXISTS cs_ability INT DEFAULT 50 COMMENT 'CS 수급 능력',
ADD COLUMN IF NOT EXISTS lane_pressure INT DEFAULT 50 COMMENT '라인전 압박력',
ADD COLUMN IF NOT EXISTS damage_dealing INT DEFAULT 50 COMMENT '딜량 기여도',
ADD COLUMN IF NOT EXISTS survivability INT DEFAULT 50 COMMENT '생존력',
ADD COLUMN IF NOT EXISTS objective_control INT DEFAULT 50 COMMENT '오브젝트 관리',
ADD COLUMN IF NOT EXISTS vision_control INT DEFAULT 50 COMMENT '시야 장악',
ADD COLUMN IF NOT EXISTS decision_making INT DEFAULT 50 COMMENT '판단력',
ADD COLUMN IF NOT EXISTS consistency INT DEFAULT 50 COMMENT '안정성';
