const mysql = require('mysql2/promise');

async function reduceCoachBuffs() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'qwe123',
    database: 'lol_card_game',
    authPlugins: {
      mysql_native_password: () => () => Buffer.alloc(0)
    }
  });

  try {
    console.log('Reducing coach buff values to maintain game balance...');

    // Reduce all buff_value by dividing by 2 (or adjust as needed)
    // This compensates for showing buffs in overall display everywhere
    const [result] = await connection.query(`
      UPDATE coaches
      SET buff_value = FLOOR(buff_value / 2.5)
      WHERE buff_type IN ('OVERALL', 'POSITION', 'TEAM')
    `);

    console.log(`Updated ${result.affectedRows} coaches`);

    // Show current coach values
    const [coaches] = await connection.query(`
      SELECT name, buff_type, buff_value, buff_target
      FROM coaches
      ORDER BY star_rating DESC, name ASC
    `);

    console.log('\nCurrent coach buff values:');
    coaches.forEach(coach => {
      console.log(`${coach.name}: ${coach.buff_type} ${coach.buff_value}${coach.buff_target ? ' (' + coach.buff_target + ')' : ''}`);
    });

    console.log('\nDone! Coach buffs reduced.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

reduceCoachBuffs();
