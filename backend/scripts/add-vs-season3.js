// Add VS Mode Season 3 - Tower of Challenge (도전의 탑)
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addVSSeason3() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
  });

  try {
    console.log('🗼 Adding VS Mode Season 3 - Tower of Challenge...\n');

    await connection.beginTransaction();

    // Total reward pool: 500,000 points
    // Distribution strategy:
    // Stages 1-20: 400 power, low rewards (early game)
    // Stages 21-60: 500-600 power, medium rewards (mid game)
    // Stages 61-90: 550-600 power, higher rewards (late game)
    // Stages 91-100: 580-630 power, highest rewards (final tower)

    const stages = [];
    let totalRewards = 0;

    // Stage 1-20: 400 power, 2000P each (40,000 total)
    for (let i = 1; i <= 20; i++) {
      stages.push({
        stage_number: i,
        ai_power: 400,
        reward_points: 2000,
      });
      totalRewards += 2000;
    }

    // Stage 21-60: 500-600 power, 4500P each (180,000 total)
    for (let i = 21; i <= 60; i++) {
      const power = Math.floor(500 + ((i - 21) / 39) * 100); // 500 -> 600
      stages.push({
        stage_number: i,
        ai_power: power,
        reward_points: 4500,
      });
      totalRewards += 4500;
    }

    // Stage 61-90: 550-600 power, 6000P each (180,000 total)
    for (let i = 61; i <= 90; i++) {
      const power = Math.floor(550 + ((i - 61) / 29) * 50); // 550 -> 600
      stages.push({
        stage_number: i,
        ai_power: power,
        reward_points: 6000,
      });
      totalRewards += 6000;
    }

    // Stage 91-100: 580-630 power, 10000P each (100,000 total)
    for (let i = 91; i <= 100; i++) {
      const power = Math.floor(580 + ((i - 91) / 9) * 50); // 580 -> 630
      stages.push({
        stage_number: i,
        ai_power: power,
        reward_points: 10000,
      });
      totalRewards += 10000;
    }

    console.log('📊 Season 3 Stage Distribution:');
    console.log(`  Stages 1-20: 400 power, 2,000P each (40,000P total)`);
    console.log(`  Stages 21-60: 500-600 power, 4,500P each (180,000P total)`);
    console.log(`  Stages 61-90: 550-600 power, 6,000P each (180,000P total)`);
    console.log(`  Stages 91-100: 580-630 power, 10,000P each (100,000P total)`);
    console.log(`  Total rewards: ${totalRewards.toLocaleString()}P\n`);

    // Insert all stages
    for (const stage of stages) {
      const isBoss = stage.stage_number === 20 || stage.stage_number === 60 ||
                     stage.stage_number === 90 || stage.stage_number === 100;
      const stageName = isBoss ? `Stage ${stage.stage_number} - BOSS` : `Stage ${stage.stage_number}`;

      await connection.query(
        `INSERT INTO vs_stages (season, stage_number, stage_name, is_boss, ai_power, reward_points, hard_mode_multiplier)
         VALUES (3, ?, ?, ?, ?, ?, 1.0)`,
        [stage.stage_number, stageName, isBoss, stage.ai_power, stage.reward_points]
      );
    }

    await connection.commit();

    console.log('✅ VS Mode Season 3 added successfully!');
    console.log('\n🗼 Tower of Challenge (도전의 탑):');
    console.log('   - 100 stages total');
    console.log('   - No hard mode');
    console.log('   - Total rewards: 500,000P');
    console.log('   - Progressive difficulty: 400 → 630 power\n');

    // Show sample stages
    console.log('📝 Sample Stages:');
    console.log(`   Stage 1: ${stages[0].ai_power} power, ${stages[0].reward_points.toLocaleString()}P`);
    console.log(`   Stage 20: ${stages[19].ai_power} power, ${stages[19].reward_points.toLocaleString()}P`);
    console.log(`   Stage 40: ${stages[39].ai_power} power, ${stages[39].reward_points.toLocaleString()}P`);
    console.log(`   Stage 60: ${stages[59].ai_power} power, ${stages[59].reward_points.toLocaleString()}P`);
    console.log(`   Stage 80: ${stages[79].ai_power} power, ${stages[79].reward_points.toLocaleString()}P`);
    console.log(`   Stage 100: ${stages[99].ai_power} power, ${stages[99].reward_points.toLocaleString()}P\n`);

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error adding VS Season 3:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

addVSSeason3().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
