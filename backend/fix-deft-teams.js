/**
 * Fix Deft's other_teams for multi-team synergy
 * Deft played for: DRX, KT, EDG, DK
 *
 * Run this script once with: node fix-deft-teams.js
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'qwe123',
  database: 'lol_card_game'
};

async function fixDeftTeams() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // ICON Deft (DRX as main team)
    await connection.query(`
      UPDATE players
      SET other_teams = 'KT,EDG,DK'
      WHERE name = 'Deft' AND team = 'DRX' AND season = 'ICON'
    `);
    console.log('✓ Updated ICON Deft (DRX)');

    // No Rival Deft (KT as main team)
    await connection.query(`
      UPDATE players
      SET other_teams = 'DRX,EDG,DK'
      WHERE name = 'Deft' AND team = 'KT' AND season = 'NR'
    `);
    console.log('✓ Updated NR Deft (KT)');

    // 18WC Deft (KT as main team)
    await connection.query(`
      UPDATE players
      SET other_teams = 'DRX,EDG,DK'
      WHERE name = '18WC Deft' AND team = 'KT' AND season = '18WC'
    `);
    console.log('✓ Updated 18WC Deft (KT)');

    // 22WC Deft (DRX as main team)
    await connection.query(`
      UPDATE players
      SET other_teams = 'KT,EDG,DK'
      WHERE name = '22WC Deft' AND team = 'DRX' AND season = '22WC'
    `);
    console.log('✓ Updated 22WC Deft (DRX)');

    // Verify the changes
    const [results] = await connection.query(`
      SELECT id, name, team, other_teams, season
      FROM players
      WHERE name LIKE '%Deft%'
      ORDER BY season, id
    `);

    console.log('\n=== Verification ===');
    results.forEach(row => {
      console.log(`ID: ${row.id}, Name: ${row.name}, Team: ${row.team}, Other Teams: ${row.other_teams}, Season: ${row.season}`);
    });

    console.log('\n✅ All Deft cards updated successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

fixDeftTeams();
