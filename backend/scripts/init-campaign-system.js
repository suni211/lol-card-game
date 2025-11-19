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
    console.log('\n🌏 Inserting campaign stages (150 total)...\n');

    // LCP - EASY (30 stages)
    console.log('📍 LCP (Easy - 짜게) - 30 stages');
    const lcpStages = [];
    for (let i = 1; i <= 30; i++) {
      const power = 300 + (i - 1) * 20;
      const reward = 50 + (i - 1) * 5;
      const firstBonus = 100 + (i - 1) * 10;
      const starBonus = 50 + (i - 1) * 5;
      lcpStages.push(`('LCP', ${i}, 'EASY', ${power}, ${reward}, ${firstBonus}, ${starBonus})`);
    }
    await connection.query(`
      INSERT IGNORE INTO campaign_stages (region, stage_number, difficulty, required_power, points_reward, first_clear_bonus, three_star_bonus) VALUES
      ${lcpStages.join(',\n      ')}
    `);

    // LTA - NORMAL (30 stages)
    console.log('📍 LTA (Normal - 짜게) - 30 stages');
    const ltaStages = [];
    for (let i = 1; i <= 30; i++) {
      const power = 550 + (i - 1) * 25;
      const reward = 120 + (i - 1) * 8;
      const firstBonus = 250 + (i - 1) * 15;
      const starBonus = 120 + (i - 1) * 8;
      ltaStages.push(`('LTA', ${i}, 'NORMAL', ${power}, ${reward}, ${firstBonus}, ${starBonus})`);
    }
    await connection.query(`
      INSERT IGNORE INTO campaign_stages (region, stage_number, difficulty, required_power, points_reward, first_clear_bonus, three_star_bonus) VALUES
      ${ltaStages.join(',\n      ')}
    `);

    // LEC - HARD (30 stages)
    console.log('📍 LEC (Hard - 보통) - 30 stages');
    const lecStages = [];
    for (let i = 1; i <= 30; i++) {
      const power = 800 + (i - 1) * 30;
      const reward = 300 + (i - 1) * 20;
      const firstBonus = 600 + (i - 1) * 40;
      const starBonus = 300 + (i - 1) * 20;
      lecStages.push(`('LEC', ${i}, 'HARD', ${power}, ${reward}, ${firstBonus}, ${starBonus})`);
    }
    await connection.query(`
      INSERT IGNORE INTO campaign_stages (region, stage_number, difficulty, required_power, points_reward, first_clear_bonus, three_star_bonus) VALUES
      ${lecStages.join(',\n      ')}
    `);

    // LPL - HELL (30 stages)
    console.log('📍 LPL (Hell - 좋게) - 30 stages');
    const lplStages = [];
    for (let i = 1; i <= 30; i++) {
      const power = 1100 + (i - 1) * 40;
      const reward = 700 + (i - 1) * 30;
      const firstBonus = 1500 + (i - 1) * 80;
      const starBonus = 700 + (i - 1) * 30;
      lplStages.push(`('LPL', ${i}, 'HELL', ${power}, ${reward}, ${firstBonus}, ${starBonus})`);
    }
    await connection.query(`
      INSERT IGNORE INTO campaign_stages (region, stage_number, difficulty, required_power, points_reward, first_clear_bonus, three_star_bonus) VALUES
      ${lplStages.join(',\n      ')}
    `);

    // LCK - HELL (30 stages, starts at 700 power)
    console.log('📍 LCK (Hell - 좋게) - 30 stages');
    const lckStages = [];
    for (let i = 1; i <= 30; i++) {
      const power = 700 + (i - 1) * 40;
      const reward = 700 + (i - 1) * 30;
      const firstBonus = 1500 + (i - 1) * 80;
      const starBonus = 700 + (i - 1) * 30;
      lckStages.push(`('LCK', ${i}, 'HELL', ${power}, ${reward}, ${firstBonus}, ${starBonus})`);
    }
    await connection.query(`
      INSERT IGNORE INTO campaign_stages (region, stage_number, difficulty, required_power, points_reward, first_clear_bonus, three_star_bonus) VALUES
      ${lckStages.join(',\n      ')}
    `);

    await connection.commit();

    console.log('\n✅ Campaign System initialized successfully!');
    console.log('\n📝 Summary:');
    console.log('   - 5 regions created (LCP, LTA, LEC, LPL, LCK)');
    console.log('   - 150 total stages (30 per region)');
    console.log('   - Difficulty progression: EASY → NORMAL → HARD → HELL');
    console.log('   - Reward progression: 짜게 → 보통 → 좋게');
    console.log('   - LCK starts at 700 power (easier entry)\n');

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
