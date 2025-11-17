// Adjust VS mode rewards and fix AI match quest
const mysql = require('mysql2/promise');
require('dotenv').config();

async function adjustRewardsAndFixQuests() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
  });

  try {
    console.log('🔄 Starting rewards adjustment and quest fix...\n');

    await connection.beginTransaction();

    // 1. VS 모드 보상 줄이기 (50% 감소)
    console.log('📉 Reducing VS mode rewards by 50%...');

    const [vsBefore] = await connection.query('SELECT stage_number, reward_points FROM vs_stages ORDER BY stage_number');
    console.log('\n현재 VS 모드 보상:');
    vsBefore.forEach(stage => {
      console.log(`  Stage ${stage.stage_number}: ${stage.reward_points} points`);
    });

    await connection.query('UPDATE vs_stages SET reward_points = FLOOR(reward_points * 0.5)');

    const [vsAfter] = await connection.query('SELECT stage_number, reward_points FROM vs_stages ORDER BY stage_number');
    console.log('\n✅ 변경된 VS 모드 보상:');
    vsAfter.forEach(stage => {
      console.log(`  Stage ${stage.stage_number}: ${stage.reward_points} points`);
    });

    // 2. AI 매치 퀘스트 확인 및 수정
    console.log('\n\n🔍 Checking AI match quest...');

    const [aiQuests] = await connection.query(`
      SELECT * FROM event_quests WHERE quest_type = 'AI_MATCH'
    `);

    if (aiQuests.length === 0) {
      console.log('⚠️  AI match quest not found! Creating new quest...');

      // AI 매치 퀘스트 생성
      await connection.query(`
        INSERT INTO event_quests
        (quest_type, quest_name, requirement, reward_mileage, is_active, start_date, end_date)
        VALUES
        ('AI_MATCH', 'AI 매치 데일리 퀘스트', 1000, 100, TRUE, '2025-01-01', '2025-12-31')
      `);

      console.log('✅ Created AI match quest: 1000 matches = 100 mileage');
    } else {
      console.log('✅ AI match quest found:');
      aiQuests.forEach(quest => {
        console.log(`   ID: ${quest.id}`);
        console.log(`   Name: ${quest.quest_name}`);
        console.log(`   Requirement: ${quest.requirement} matches`);
        console.log(`   Reward: ${quest.reward_mileage} mileage`);
        console.log(`   Active: ${quest.is_active ? 'YES' : 'NO'}`);
        console.log(`   Period: ${quest.start_date} ~ ${quest.end_date}`);
      });

      // 비활성화되어 있으면 활성화
      if (!aiQuests[0].is_active) {
        await connection.query(`
          UPDATE event_quests
          SET is_active = TRUE
          WHERE quest_type = 'AI_MATCH'
        `);
        console.log('✅ Activated AI match quest');
      }

      // 날짜가 지났으면 연장
      const endDate = new Date(aiQuests[0].end_date);
      const now = new Date();
      if (endDate < now) {
        await connection.query(`
          UPDATE event_quests
          SET end_date = '2025-12-31'
          WHERE quest_type = 'AI_MATCH'
        `);
        console.log('✅ Extended AI match quest period to 2025-12-31');
      }
    }

    // 3. 모든 이벤트 퀘스트 확인
    console.log('\n\n📋 All event quests:');
    const [allQuests] = await connection.query('SELECT * FROM event_quests ORDER BY quest_type');

    allQuests.forEach(quest => {
      console.log(`\n  ${quest.quest_type}:`);
      console.log(`    Requirement: ${quest.requirement}`);
      console.log(`    Reward: ${quest.reward_mileage} mileage`);
      console.log(`    Active: ${quest.is_active ? 'YES' : 'NO'}`);
    });

    await connection.commit();

    console.log('\n\n✅ All adjustments completed successfully!');
    console.log('\n📝 Summary:');
    console.log('  - VS mode rewards reduced by 50%');
    console.log('  - AI match quest verified/fixed');
    console.log('  - Event quests checked\n');

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

adjustRewardsAndFixQuests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
