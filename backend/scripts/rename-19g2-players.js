// Rename 19G2 players to add "19G2 " prefix
const mysql = require('mysql2/promise');
require('dotenv').config();

async function rename19G2Players() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
  });

  try {
    console.log('🔄 Renaming 19G2 players to add "19G2 " prefix...\n');

    await connection.beginTransaction();

    // Get all 19G2 players without prefix
    const [players] = await connection.query(`
      SELECT id, name, position
      FROM players
      WHERE season = '19G2'
        AND name NOT LIKE '19G2 %'
      ORDER BY FIELD(position, 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT')
    `);

    console.log(`📊 Found ${players.length} 19G2 players to rename\n`);

    if (players.length === 0) {
      console.log('✅ All 19G2 players already have the correct prefix!');
      await connection.end();
      return;
    }

    // Rename players
    for (const player of players) {
      const newName = `19G2 ${player.name}`;
      await connection.query(
        'UPDATE players SET name = ? WHERE id = ?',
        [newName, player.id]
      );
      console.log(`✅ ${player.name} -> ${newName}`);
    }

    await connection.commit();

    console.log('\n✅ 19G2 players renamed successfully!');
    console.log('\n📝 Renamed players:');
    console.log('   - Wunder -> 19G2 Wunder');
    console.log('   - Jankos -> 19G2 Jankos');
    console.log('   - Caps -> 19G2 Caps');
    console.log('   - Perkz -> 19G2 Perkz');
    console.log('   - Mikyx -> 19G2 Mikyx\n');

    // Verify
    const [updated] = await connection.query(`
      SELECT id, name, team, position, season
      FROM players
      WHERE season = '19G2'
      ORDER BY FIELD(position, 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT')
    `);

    console.log('📋 Current 19G2 players:');
    updated.forEach(p => {
      console.log(`   ${p.position}: ${p.name} (${p.team})`);
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error renaming 19G2 players:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

rename19G2Players().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
