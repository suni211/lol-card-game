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

      // Base stats proportional to overall (with some randomization)
      // Formula: (overall * weight) + random(-5 to +5) capped between 50-200
      const randomize = (base, variance = 5) => {
        const random = Math.floor(Math.random() * (variance * 2 + 1)) - variance;
        return Math.max(50, Math.min(200, base + random));
      };

      // Different positions have different stat weights
      let stats = {};

      switch(player.position) {
        case 'TOP':
          stats = {
            // 기본 4개
            laning: randomize(Math.floor(overall * 0.95)),
            teamfight: randomize(Math.floor(overall * 0.95)),
            macro: randomize(Math.floor(overall * 0.85)),
            mental: randomize(Math.floor(overall * 0.90)),
            // 추가 8개
            cs_ability: randomize(Math.floor(overall * 0.90)),
            lane_pressure: randomize(Math.floor(overall * 0.95)),
            damage_dealing: randomize(Math.floor(overall * 0.90)),
            survivability: randomize(Math.floor(overall * 0.92)),
            objective_control: randomize(Math.floor(overall * 0.85)),
            vision_control: randomize(Math.floor(overall * 0.75)),
            decision_making: randomize(Math.floor(overall * 0.85)),
            consistency: randomize(Math.floor(overall * 0.90))
          };
          break;

        case 'JUNGLE':
          stats = {
            // 기본 4개
            laning: randomize(Math.floor(overall * 0.70)),
            teamfight: randomize(Math.floor(overall * 0.90)),
            macro: randomize(Math.floor(overall * 0.95)),
            mental: randomize(Math.floor(overall * 0.90)),
            // 추가 8개
            cs_ability: randomize(Math.floor(overall * 0.75)),
            lane_pressure: randomize(Math.floor(overall * 0.85)),
            damage_dealing: randomize(Math.floor(overall * 0.85)),
            survivability: randomize(Math.floor(overall * 0.85)),
            objective_control: randomize(Math.floor(overall * 0.95)),
            vision_control: randomize(Math.floor(overall * 0.95)),
            decision_making: randomize(Math.floor(overall * 0.95)),
            consistency: randomize(Math.floor(overall * 0.85))
          };
          break;

        case 'MID':
          stats = {
            // 기본 4개
            laning: randomize(Math.floor(overall * 0.95)),
            teamfight: randomize(Math.floor(overall * 0.90)),
            macro: randomize(Math.floor(overall * 0.90)),
            mental: randomize(Math.floor(overall * 0.92)),
            // 추가 8개
            cs_ability: randomize(Math.floor(overall * 0.95)),
            lane_pressure: randomize(Math.floor(overall * 0.90)),
            damage_dealing: randomize(Math.floor(overall * 0.95)),
            survivability: randomize(Math.floor(overall * 0.85)),
            objective_control: randomize(Math.floor(overall * 0.85)),
            vision_control: randomize(Math.floor(overall * 0.80)),
            decision_making: randomize(Math.floor(overall * 0.95)),
            consistency: randomize(Math.floor(overall * 0.90))
          };
          break;

        case 'ADC':
          stats = {
            // 기본 4개
            laning: randomize(Math.floor(overall * 0.90)),
            teamfight: randomize(Math.floor(overall * 0.95)),
            macro: randomize(Math.floor(overall * 0.85)),
            mental: randomize(Math.floor(overall * 0.95)),
            // 추가 8개
            cs_ability: randomize(Math.floor(overall * 0.95)),
            lane_pressure: randomize(Math.floor(overall * 0.85)),
            damage_dealing: randomize(Math.floor(overall * 0.95)),
            survivability: randomize(Math.floor(overall * 0.88)),
            objective_control: randomize(Math.floor(overall * 0.80)),
            vision_control: randomize(Math.floor(overall * 0.75)),
            decision_making: randomize(Math.floor(overall * 0.90)),
            consistency: randomize(Math.floor(overall * 0.95))
          };
          break;

        case 'SUPPORT':
          stats = {
            // 기본 4개
            laning: randomize(Math.floor(overall * 0.85)),
            teamfight: randomize(Math.floor(overall * 0.95)),
            macro: randomize(Math.floor(overall * 0.90)),
            mental: randomize(Math.floor(overall * 0.90)),
            // 추가 8개
            cs_ability: randomize(Math.floor(overall * 0.60)),
            lane_pressure: randomize(Math.floor(overall * 0.90)),
            damage_dealing: randomize(Math.floor(overall * 0.70)),
            survivability: randomize(Math.floor(overall * 0.90)),
            objective_control: randomize(Math.floor(overall * 0.92)),
            vision_control: randomize(Math.floor(overall * 0.95)),
            decision_making: randomize(Math.floor(overall * 0.92)),
            consistency: randomize(Math.floor(overall * 0.85))
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
    console.log('   - Stats range: 50-200');
    console.log('   - Stats are proportional to overall rating with position-specific weights');
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
