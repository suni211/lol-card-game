// Add 12 stats to 18WC players based on overall rating
const mysql = require('mysql2/promise');
require('dotenv').config();

async function add18WCStats() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
  });

  try {
    console.log('🔄 Adding 12 stats to 18WC players based on overall...\n');

    await connection.beginTransaction();

    // Get all 18WC players
    const [players] = await connection.query(`
      SELECT id, name, overall, position
      FROM players
      WHERE season = '18WC'
    `);

    console.log(`📊 Found ${players.length} 18WC players\n`);

    if (players.length === 0) {
      console.log('⚠️  No 18WC players found. Make sure season column is set correctly.');
      await connection.rollback();
      return;
    }

    // Calculate and update stats for each player
    for (const player of players) {
      const overall = player.overall;

      // Pure stat calculation - no randomization, only overall proportional
      // Range: 1-200 based on overall * weight
      const calculate = (weight) => {
        return Math.max(1, Math.min(200, Math.floor(overall * weight)));
      };

      // Different positions have different stat weights
      let stats = {};

      switch(player.position) {
        case 'TOP':
          stats = {
            // 기본 4개 - 탑은 라인전, 한타 강점
            laning: calculate(1.0),           // 강점
            teamfight: calculate(1.0),        // 강점
            macro: calculate(0.80),
            mental: calculate(0.85),
            // 추가 8개
            cs_ability: calculate(0.95),
            lane_pressure: calculate(1.0),    // 강점
            damage_dealing: calculate(0.90),
            survivability: calculate(0.95),
            objective_control: calculate(0.75),
            vision_control: calculate(0.50),  // 약점 (더 낮춤)
            decision_making: calculate(0.80),
            consistency: calculate(0.85)
          };
          break;

        case 'JUNGLE':
          stats = {
            // 기본 4개 - 정글은 운영, 시야, 판단력 강점
            laning: calculate(0.40),          // 약점 (라인 없음, 더 낮춤)
            teamfight: calculate(0.90),
            macro: calculate(1.0),            // 강점
            mental: calculate(0.85),
            // 추가 8개
            cs_ability: calculate(0.50),      // 약점 (더 낮춤)
            lane_pressure: calculate(0.70),
            damage_dealing: calculate(0.85),
            survivability: calculate(0.85),
            objective_control: calculate(1.0), // 강점
            vision_control: calculate(1.0),    // 강점
            decision_making: calculate(1.0),   // 강점
            consistency: calculate(0.80)
          };
          break;

        case 'MID':
          stats = {
            // 기본 4개 - 미드는 올라운더
            laning: calculate(1.0),           // 강점
            teamfight: calculate(0.95),
            macro: calculate(0.90),
            mental: calculate(0.95),
            // 추가 8개
            cs_ability: calculate(1.0),       // 강점
            lane_pressure: calculate(0.95),
            damage_dealing: calculate(1.0),   // 강점
            survivability: calculate(0.80),
            objective_control: calculate(0.85),
            vision_control: calculate(0.75),
            decision_making: calculate(1.0),  // 강점
            consistency: calculate(0.90)
          };
          break;

        case 'ADC':
          stats = {
            // 기본 4개 - 원딜은 딜량, 한타, 일관성 강점
            laning: calculate(0.90),
            teamfight: calculate(1.0),        // 강점
            macro: calculate(0.75),
            mental: calculate(0.95),
            // 추가 8개
            cs_ability: calculate(1.0),       // 강점
            lane_pressure: calculate(0.80),
            damage_dealing: calculate(1.0),   // 강점
            survivability: calculate(0.85),
            objective_control: calculate(0.65), // 약점 (더 낮춤)
            vision_control: calculate(0.55),    // 약점 (더 낮춤)
            decision_making: calculate(0.85),
            consistency: calculate(1.0)         // 강점
          };
          break;

        case 'SUPPORT':
          stats = {
            // 기본 4개 - 서포터는 한타, 시야, 운영 강점
            laning: calculate(0.85),
            teamfight: calculate(1.0),        // 강점
            macro: calculate(0.90),
            mental: calculate(0.90),
            // 추가 8개
            cs_ability: calculate(0.35),      // 약점 (CS 거의 안먹음, 더 낮춤)
            lane_pressure: calculate(0.90),
            damage_dealing: calculate(0.45),  // 약점 (딜 거의 없음, 더 낮춤)
            survivability: calculate(0.90),
            objective_control: calculate(0.95),
            vision_control: calculate(1.0),   // 강점
            decision_making: calculate(0.95),
            consistency: calculate(0.85)
          };
          break;
      }

      // Update player stats
      await connection.query(`
        UPDATE players
        SET laning = ?,
            teamfight = ?,
            macro = ?,
            mental = ?,
            cs_ability = ?,
            lane_pressure = ?,
            damage_dealing = ?,
            survivability = ?,
            objective_control = ?,
            vision_control = ?,
            decision_making = ?,
            consistency = ?
        WHERE id = ?
      `, [
        stats.laning,
        stats.teamfight,
        stats.macro,
        stats.mental,
        stats.cs_ability,
        stats.lane_pressure,
        stats.damage_dealing,
        stats.survivability,
        stats.objective_control,
        stats.vision_control,
        stats.decision_making,
        stats.consistency,
        player.id
      ]);

      console.log(`✅ ${player.name} (${player.position}, OVR: ${overall})`);
      console.log(`   기본: Laning ${stats.laning}, Teamfight ${stats.teamfight}, Macro ${stats.macro}, Mental ${stats.mental}`);
      console.log(`   추가: CS ${stats.cs_ability}, Pressure ${stats.lane_pressure}, Damage ${stats.damage_dealing}, Survival ${stats.survivability}`);
      console.log(`         Objective ${stats.objective_control}, Vision ${stats.vision_control}, Decision ${stats.decision_making}, Consistency ${stats.consistency}\n`);
    }

    await connection.commit();

    console.log('\n✅ Successfully added 12 stats to all 18WC players!');
    console.log('\n📝 Summary:');
    console.log(`   - Total players updated: ${players.length}`);
    console.log('   - Stats range: 1-200 (no randomization, pure overall proportional)');
    console.log('   - Position weaknesses emphasized (lower percentages)');
    console.log('   - 기본 4개: laning, teamfight, macro, mental');
    console.log('   - 추가 8개: cs_ability, lane_pressure, damage_dealing, survivability, objective_control, vision_control, decision_making, consistency\n');

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error adding 18WC stats:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

add18WCStats().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
