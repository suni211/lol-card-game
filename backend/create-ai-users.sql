-- AI 더미 유저 생성 (20명)
-- rating만 설정하고 tier는 자동 계산됨
-- rating 기준: 0-799=IRON, 800-999=BRONZE, 1000-1199=SILVER, 1200-1399=GOLD, 1400-1599=PLATINUM, 1600-1799=DIAMOND, 1800-1999=MASTER, 2000+=CHALLENGER
INSERT INTO users (username, email, password, points, rating, is_admin) VALUES
('AI_Faker', 'ai_faker@bot.com', '$2b$10$dummyhashedpassword1', 0, 1850, 0),    -- MASTER
('AI_Chovy', 'ai_chovy@bot.com', '$2b$10$dummyhashedpassword2', 0, 1900, 0),    -- MASTER
('AI_ShowMaker', 'ai_showmaker@bot.com', '$2b$10$dummyhashedpassword3', 0, 1750, 0),  -- DIAMOND
('AI_Rookie', 'ai_rookie@bot.com', '$2b$10$dummyhashedpassword4', 0, 1700, 0),   -- DIAMOND
('AI_Scout', 'ai_scout@bot.com', '$2b$10$dummyhashedpassword5', 0, 1650, 0),    -- DIAMOND
('AI_Deft', 'ai_deft@bot.com', '$2b$10$dummyhashedpassword6', 0, 1550, 0),     -- PLATINUM
('AI_Ruler', 'ai_ruler@bot.com', '$2b$10$dummyhashedpassword7', 0, 1800, 0),    -- MASTER
('AI_Gumayusi', 'ai_gumayusi@bot.com', '$2b$10$dummyhashedpassword8', 0, 1700, 0),  -- DIAMOND
('AI_Keria', 'ai_keria@bot.com', '$2b$10$dummyhashedpassword9', 0, 1750, 0),    -- DIAMOND
('AI_Canyon', 'ai_canyon@bot.com', '$2b$10$dummyhashedpassword10', 0, 1950, 0),  -- MASTER
('AI_Oner', 'ai_oner@bot.com', '$2b$10$dummyhashedpassword11', 0, 1700, 0),     -- DIAMOND
('AI_Peanut', 'ai_peanut@bot.com', '$2b$10$dummyhashedpassword12', 0, 1650, 0),  -- DIAMOND
('AI_Zeus', 'ai_zeus@bot.com', '$2b$10$dummyhashedpassword13', 0, 1750, 0),     -- DIAMOND
('AI_Kiin', 'ai_kiin@bot.com', '$2b$10$dummyhashedpassword14', 0, 1650, 0),     -- DIAMOND
('AI_Doran', 'ai_doran@bot.com', '$2b$10$dummyhashedpassword15', 0, 1600, 0),    -- PLATINUM
('AI_Delight', 'ai_delight@bot.com', '$2b$10$dummyhashedpassword16', 0, 1500, 0), -- PLATINUM
('AI_Viper', 'ai_viper@bot.com', '$2b$10$dummyhashedpassword17', 0, 1750, 0),    -- DIAMOND
('AI_Peyz', 'ai_peyz@bot.com', '$2b$10$dummyhashedpassword18', 0, 1700, 0),     -- DIAMOND
('AI_Zeka', 'ai_zeka@bot.com', '$2b$10$dummyhashedpassword19', 0, 1650, 0),     -- DIAMOND
('AI_BDD', 'ai_bdd@bot.com', '$2b$10$dummyhashedpassword20', 0, 1600, 0);       -- PLATINUM
