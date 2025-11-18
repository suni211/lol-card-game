// Reduce VS mode rewards significantly
const mysql = require('mysql2/promise');
require('dotenv').config();

async function reduceVSRewards() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
  });

  try {
    console.log('🔄 Reducing VS mode rewards significantly...\n');

    await connection.beginTransaction();

    // Get current VS rewards
    const [currentRewards] = await connection.query(
      'SELECT stage_number, reward_points, hard_mode_multiplier FROM vs_stages ORDER BY stage_number'
    );

    console.log('📊 Current VS mode rewards:');
    currentRewards.forEach((stage) => {
      const normalReward = stage.reward_points;
      const hardReward = stage.reward_points * stage.hard_mode_multiplier;
      console.log(`  Stage ${stage.stage_number}: Normal ${normalReward}P, Hard ${hardReward}P`);
    });

    // Reduce rewards by 70% (multiply by 0.3)
    await connection.query(
      'UPDATE vs_stages SET reward_points = FLOOR(reward_points * 0.3)'
    );

    // Get updated rewards
    const [updatedRewards] = await connection.query(
      'SELECT stage_number, reward_points, hard_mode_multiplier FROM vs_stages ORDER BY stage_number'
    );

    console.log('\n✅ Updated VS mode rewards (70% reduction):');
    updatedRewards.forEach((stage) => {
      const normalReward = stage.reward_points;
      const hardReward = stage.reward_points * stage.hard_mode_multiplier;
      console.log(`  Stage ${stage.stage_number}: Normal ${normalReward}P, Hard ${hardReward}P`);
    });

    await connection.commit();

    console.log('\n✅ VS mode rewards reduced successfully!');
    console.log('\n📝 Summary:');
    console.log('   - All VS stage rewards reduced by 70%');
    console.log('   - Hard mode multiplier unchanged');
    console.log('   - Economy balanced to prevent inflation\n');

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error reducing VS rewards:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

reduceVSRewards().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
