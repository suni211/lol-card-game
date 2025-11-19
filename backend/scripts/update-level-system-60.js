const mysql = require('mysql2/promise');

async function updateLevelSystem() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'qwe123',
    database: 'lol_card_game',
  });

  try {
    console.log('🔄 Updating level system to max level 60...');

    // Clear existing level rewards
    await connection.query('DELETE FROM level_rewards');
    console.log('✅ Cleared existing level rewards');

    // Generate level rewards (levels 1-60)
    // 난이도 대폭 증가: 지수적 성장 + 높은 배수 적용
    const levelRewards = [];

    for (let level = 1; level <= 60; level++) {
      let requiredExp, rewardPoints, rewardDescription;

      if (level === 1) {
        requiredExp = 0;
        rewardPoints = 0;
        rewardDescription = '시작';
      } else {
        // 경험치 요구량 - 매우 가파른 증가 (지수 2.5 + 높은 기본 배수)
        // 레벨 2: 500 exp
        // 레벨 10: ~50,000 exp
        // 레벨 20: ~800,000 exp
        // 레벨 30: ~5,000,000 exp
        // 레벨 40: ~15,000,000 exp
        // 레벨 50: ~35,000,000 exp
        // 레벨 60: ~65,000,000 exp (누적)
        const baseExp = 250;
        const multiplier = Math.pow(level, 2.5);
        requiredExp = Math.floor(baseExp * multiplier);

        // 보상 포인트 - 레벨에 비례하여 증가
        // 레벨 2-10: 1,000-5,000P
        // 레벨 11-20: 6,000-15,000P
        // 레벨 21-30: 16,000-30,000P
        // 레벨 31-40: 35,000-60,000P
        // 레벨 41-50: 65,000-100,000P
        // 레벨 51-60: 110,000-200,000P
        if (level <= 10) {
          rewardPoints = 1000 * level;
        } else if (level <= 20) {
          rewardPoints = 5000 + (level - 10) * 1000;
        } else if (level <= 30) {
          rewardPoints = 15000 + (level - 20) * 1500;
        } else if (level <= 40) {
          rewardPoints = 30000 + (level - 30) * 2500;
        } else if (level <= 50) {
          rewardPoints = 55000 + (level - 40) * 3500;
        } else {
          rewardPoints = 90000 + (level - 50) * 9000;
        }

        // 보상 설명
        if (level % 10 === 0) {
          rewardDescription = `레벨 ${level} 달성 - 마일스톤 보상!`;
        } else if (level === 60) {
          rewardDescription = '최고 레벨 달성 - 전설의 플레이어!';
        } else if (level >= 50) {
          rewardDescription = `레벨 ${level} - 전설 등급 플레이어`;
        } else if (level >= 40) {
          rewardDescription = `레벨 ${level} - 마스터 등급 플레이어`;
        } else if (level >= 30) {
          rewardDescription = `레벨 ${level} - 다이아 등급 플레이어`;
        } else if (level >= 20) {
          rewardDescription = `레벨 ${level} - 플래티넘 등급 플레이어`;
        } else if (level >= 10) {
          rewardDescription = `레벨 ${level} - 골드 등급 플레이어`;
        } else {
          rewardDescription = `레벨 ${level} 달성`;
        }
      }

      levelRewards.push([level, requiredExp, rewardPoints, rewardDescription]);

      // Log every 10 levels for visibility
      if (level % 10 === 0 || level === 1 || level === 60) {
        console.log(`Level ${level}: ${requiredExp.toLocaleString()} EXP required, ${rewardPoints.toLocaleString()}P reward`);
      }
    }

    // Insert all level rewards
    await connection.query(
      'INSERT INTO level_rewards (level, required_exp, reward_points, reward_description) VALUES ?',
      [levelRewards]
    );

    console.log('✅ Inserted 60 level rewards');

    // Show summary
    console.log('\n📊 Level System Summary:');
    const [summary] = await connection.query(`
      SELECT
        MIN(level) as min_level,
        MAX(level) as max_level,
        MIN(required_exp) as min_exp,
        MAX(required_exp) as max_exp,
        SUM(reward_points) as total_rewards
      FROM level_rewards
      WHERE level > 1
    `);
    console.log('Min Level:', summary[0].min_level);
    console.log('Max Level:', summary[0].max_level);
    console.log('Max EXP Required:', summary[0].max_exp.toLocaleString());
    console.log('Total Possible Rewards:', summary[0].total_rewards.toLocaleString() + 'P');

    console.log('\n🎉 Level system updated successfully to max level 60!');
    console.log('⚠️  NOTE: This is VERY HARD mode - leveling will be extremely challenging!');
  } catch (error) {
    console.error('❌ Error updating level system:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the update
updateLevelSystem()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
