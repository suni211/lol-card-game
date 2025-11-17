// Add 8 stats to 18WC players based on overall rating
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
    console.log('🔄 Adding 8 stats to 18WC players based on overall...\n');

    await connection.beginTransaction();

    // 1. Check if stat columns exist, if not add them
    console.log('📋 Checking if stat columns exist...');

    const statColumns = [
      'laning',
      'vision',
      'mechanics',
      'teamfight',
      'adaptability',
      'champion_pool',
      'consistency',
      'synergy'
    ];

    for (const col of statColumns) {
      try {
        await connection.query(`
          ALTER TABLE players
          ADD COLUMN IF NOT EXISTS ${col} INT DEFAULT NULL
        `);
        console.log(`✅ Added/verified column: ${col}`);
      } catch (e) {
        console.log(`ℹ️  Column ${col} may already exist`);
      }
    }

    // 2. Get all 18WC players
    const [players] = await connection.query(`
      SELECT id, name, overall, position
      FROM players
      WHERE season = '18WC'
    `);

    console.log(`\n📊 Found ${players.length} 18WC players\n`);

    if (players.length === 0) {
      console.log('⚠️  No 18WC players found. Make sure season column is set correctly.');
      await connection.rollback();
      return;
    }

    // 3. Calculate and update stats for each player
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
            laning: randomize(Math.floor(overall * 0.95)),
            vision: randomize(Math.floor(overall * 0.75)),
            mechanics: randomize(Math.floor(overall * 0.90)),
            teamfight: randomize(Math.floor(overall * 0.95)),
            adaptability: randomize(Math.floor(overall * 0.85)),
            champion_pool: randomize(Math.floor(overall * 0.80)),
            consistency: randomize(Math.floor(overall * 0.90)),
            synergy: randomize(Math.floor(overall * 0.85))
          };
          break;

        case 'JUNGLE':
          stats = {
            laning: randomize(Math.floor(overall * 0.70)),
            vision: randomize(Math.floor(overall * 0.95)),
            mechanics: randomize(Math.floor(overall * 0.85)),
            teamfight: randomize(Math.floor(overall * 0.90)),
            adaptability: randomize(Math.floor(overall * 0.95)),
            champion_pool: randomize(Math.floor(overall * 0.85)),
            consistency: randomize(Math.floor(overall * 0.85)),
            synergy: randomize(Math.floor(overall * 0.90))
          };
          break;

        case 'MID':
          stats = {
            laning: randomize(Math.floor(overall * 0.95)),
            vision: randomize(Math.floor(overall * 0.80)),
            mechanics: randomize(Math.floor(overall * 0.95)),
            teamfight: randomize(Math.floor(overall * 0.90)),
            adaptability: randomize(Math.floor(overall * 0.95)),
            champion_pool: randomize(Math.floor(overall * 0.90)),
            consistency: randomize(Math.floor(overall * 0.90)),
            synergy: randomize(Math.floor(overall * 0.85))
          };
          break;

        case 'ADC':
          stats = {
            laning: randomize(Math.floor(overall * 0.90)),
            vision: randomize(Math.floor(overall * 0.75)),
            mechanics: randomize(Math.floor(overall * 0.95)),
            teamfight: randomize(Math.floor(overall * 0.95)),
            adaptability: randomize(Math.floor(overall * 0.80)),
            champion_pool: randomize(Math.floor(overall * 0.75)),
            consistency: randomize(Math.floor(overall * 0.95)),
            synergy: randomize(Math.floor(overall * 0.90))
          };
          break;

        case 'SUPPORT':
          stats = {
            laning: randomize(Math.floor(overall * 0.85)),
            vision: randomize(Math.floor(overall * 0.95)),
            mechanics: randomize(Math.floor(overall * 0.80)),
            teamfight: randomize(Math.floor(overall * 0.95)),
            adaptability: randomize(Math.floor(overall * 0.90)),
            champion_pool: randomize(Math.floor(overall * 0.85)),
            consistency: randomize(Math.floor(overall * 0.85)),
            synergy: randomize(Math.floor(overall * 0.95))
          };
          break;
      }

      // Update player stats
      await connection.query(`
        UPDATE players
        SET laning = ?,
            vision = ?,
            mechanics = ?,
            teamfight = ?,
            adaptability = ?,
            champion_pool = ?,
            consistency = ?,
            synergy = ?
        WHERE id = ?
      `, [
        stats.laning,
        stats.vision,
        stats.mechanics,
        stats.teamfight,
        stats.adaptability,
        stats.champion_pool,
        stats.consistency,
        stats.synergy,
        player.id
      ]);

      console.log(`✅ ${player.name} (${player.position}, OVR: ${overall})`);
      console.log(`   Laning: ${stats.laning}, Vision: ${stats.vision}, Mechanics: ${stats.mechanics}`);
      console.log(`   Teamfight: ${stats.teamfight}, Adaptability: ${stats.adaptability}`);
      console.log(`   Champion Pool: ${stats.champion_pool}, Consistency: ${stats.consistency}, Synergy: ${stats.synergy}\n`);
    }

    await connection.commit();

    console.log('\n✅ Successfully added 8 stats to all 18WC players!');
    console.log('\n📝 Summary:');
    console.log(`   - Total players updated: ${players.length}`);
    console.log('   - Stats added: laning, vision, mechanics, teamfight, adaptability, champion_pool, consistency, synergy');
    console.log('   - Stats are proportional to overall rating with position-specific weights\n');

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
