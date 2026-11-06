-- Real League of Legends coaching personnel, game-only star rarity values.
-- Star ratings below represent in-game drop rarity, not objective coaching ability.
-- Coaches sourced from 2026 roster coverage, not synthetic names.
-- Existing coaches and user inventory are preserved.
USE lol_card_game;
ALTER TABLE user_coaches
  ADD COLUMN IF NOT EXISTS enhancement_level INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_buff_value INT NULL;
INSERT IGNORE INTO coaches (name,star_rating,buff_type,buff_value,buff_target,description,image_url) VALUES
('Ryu',5,'STRATEGY',5,NULL,'2026 Gen.G 코칭스태프 · 게임 내 5성',NULL),
('Homme',5,'STRATEGY',5,NULL,'2026 한화생명 감독 · 게임 내 5성',NULL),
('Tom',5,'STRATEGY',5,NULL,'2026 T1 코칭스태프 · 게임 내 5성',NULL),
('Daeny',5,'STRATEGY',5,NULL,'2026 BLG 코칭스태프 · 게임 내 5성',NULL),
('cvMax',4,'STRATEGY',3,NULL,'2026 Dplus KIA 감독 · 게임 내 4성',NULL),
('Perkz',4,'STRATEGY',3,NULL,'2026 G2 Esports 코칭스태프 · 게임 내 4성',NULL),
('Mata',4,'STRATEGY',3,NULL,'2026 T1 코치 · 게임 내 4성',NULL),
('Reignover',4,'STRATEGY',3,NULL,'2026 LYON 코칭스태프 · 게임 내 4성',NULL),
('Lyn',3,'STRATEGY',2,NULL,'2026 Gen.G 코치 · 게임 내 3성',NULL),
('Mowgli',3,'STRATEGY',2,NULL,'2026 한화생명 코치 · 게임 내 3성',NULL),
('Easyhoon',3,'STRATEGY',2,NULL,'2026 T1 코치 · 게임 내 3성',NULL),
('WarHorse',3,'STRATEGY',2,NULL,'2026 LCP 코칭스태프 · 게임 내 3성',NULL),
('Nova',2,'STRATEGY',1,NULL,'2026 Gen.G 코치 · 게임 내 2성',NULL),
('Hachani',2,'STRATEGY',1,NULL,'2026 Dplus KIA 코치 · 게임 내 2성',NULL),
('SIN',1,'STRATEGY',0,NULL,'2026 한화생명 코치 · 게임 내 1성',NULL);
