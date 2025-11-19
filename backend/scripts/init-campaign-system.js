// Initialize Campaign System
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initCampaignSystem() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
  });

  try {
    console.log('🎮 Initializing Campaign System...\n');

    await connection.beginTransaction();

    // Create tables
    console.log('📋 Creating campaign_stages table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS campaign_stages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        region VARCHAR(20) NOT NULL,
        stage_number INT NOT NULL,
        difficulty ENUM('EASY', 'NORMAL', 'HARD', 'HELL') NOT NULL,
        required_power INT NOT NULL,
        points_reward INT NOT NULL,
        first_clear_bonus INT NOT NULL DEFAULT 0,
        three_star_bonus INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_region_stage (region, stage_number)
      )
    `);

    console.log('📋 Creating user_campaign_progress table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_campaign_progress (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        stage_id INT NOT NULL,
        stars INT NOT NULL DEFAULT 0,
        best_score INT NOT NULL DEFAULT 0,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (stage_id) REFERENCES campaign_stages(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_stage (user_id, stage_id)
      )
    `);

    // Insert stages
    console.log('\n🌏 Inserting campaign stages...\n');

    // LCP - EASY
    console.log('📍 LCP (Easy - 짜게)');
    await connection.query(`
      INSERT IGNORE INTO campaign_stages (region, stage_number, difficulty, required_power, points_reward, first_clear_bonus, three_star_bonus) VALUES
      ('LCP', 1, 'EASY', 300, 50, 100, 50),
      ('LCP', 2, 'EASY', 350, 60, 120, 60),
      ('LCP', 3, 'EASY', 400, 70, 140, 70),
      ('LCP', 4, 'EASY', 450, 80, 160, 80),
      ('LCP', 5, 'EASY', 500, 100, 200, 100)
    `);

    // LTA - NORMAL
    console.log('📍 LTA (Normal - 짜게)');
    await connection.query(`
      INSERT IGNORE INTO campaign_stages (region, stage_number, difficulty, required_power, points_reward, first_clear_bonus, three_star_bonus) VALUES
      ('LTA', 1, 'NORMAL', 550, 120, 250, 120),
      ('LTA', 2, 'NORMAL', 600, 140, 300, 140),
      ('LTA', 3, 'NORMAL', 650, 160, 350, 160),
      ('LTA', 4, 'NORMAL', 700, 180, 400, 180),
      ('LTA', 5, 'NORMAL', 750, 200, 450, 200)
    `);

    // LEC - HARD
    console.log('📍 LEC (Hard - 보통)');
    await connection.query(`
      INSERT IGNORE INTO campaign_stages (region, stage_number, difficulty, required_power, points_reward, first_clear_bonus, three_star_bonus) VALUES
      ('LEC', 1, 'HARD', 800, 300, 600, 300),
      ('LEC', 2, 'HARD', 850, 350, 700, 350),
      ('LEC', 3, 'HARD', 900, 400, 800, 400),
      ('LEC', 4, 'HARD', 950, 450, 900, 450),
      ('LEC', 5, 'HARD', 1000, 500, 1000, 500)
    `);

    // LPL - HELL
    console.log('📍 LPL (Hell - 좋게)');
    await connection.query(`
      INSERT IGNORE INTO campaign_stages (region, stage_number, difficulty, required_power, points_reward, first_clear_bonus, three_star_bonus) VALUES
      ('LPL', 1, 'HELL', 1100, 700, 1500, 700),
      ('LPL', 2, 'HELL', 1200, 800, 1700, 800),
      ('LPL', 3, 'HELL', 1300, 900, 2000, 900),
      ('LPL', 4, 'HELL', 1400, 1000, 2500, 1000),
      ('LPL', 5, 'HELL', 1500, 1200, 3000, 1200)
    `);

    // LCK - HELL
    console.log('📍 LCK (Hell - 좋게)');
    await connection.query(`
      INSERT IGNORE INTO campaign_stages (region, stage_number, difficulty, required_power, points_reward, first_clear_bonus, three_star_bonus) VALUES
      ('LCK', 1, 'HELL', 1100, 700, 1500, 700),
      ('LCK', 2, 'HELL', 1200, 800, 1700, 800),
      ('LCK', 3, 'HELL', 1300, 900, 2000, 900),
      ('LCK', 4, 'HELL', 1400, 1000, 2500, 1000),
      ('LCK', 5, 'HELL', 1500, 1200, 3000, 1200)
    `);

    await connection.commit();

    console.log('\n✅ Campaign System initialized successfully!');
    console.log('\n📝 Summary:');
    console.log('   - 5 regions created (LCP, LTA, LEC, LPL, LCK)');
    console.log('   - 25 total stages');
    console.log('   - Difficulty progression: EASY → NORMAL → HARD → HELL');
    console.log('   - Reward progression: 짜게 → 보통 → 좋게\n');

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error initializing campaign system:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

initCampaignSystem().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
