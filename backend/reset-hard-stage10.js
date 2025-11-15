// Reset hard mode stage 10 completion for all users
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetHardStage10() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game'
  });

  try {
    console.log('Connected to database...');

    // Get all users with hard stage 10 cleared
    const [users] = await connection.query(
      'SELECT id, user_id, hard_stages_cleared FROM user_vs_progress'
    );

    console.log(`Found ${users.length} user progress records`);

    let updatedCount = 0;

    for (const user of users) {
      const hardStages = JSON.parse(user.hard_stages_cleared || '[]');

      if (hardStages.includes(10)) {
        // Remove 10 from the array
        const newHardStages = hardStages.filter(stage => stage !== 10);

        await connection.query(
          'UPDATE user_vs_progress SET hard_stages_cleared = ? WHERE id = ?',
          [JSON.stringify(newHardStages), user.id]
        );

        console.log(`✓ Reset user ${user.user_id}: ${JSON.stringify(hardStages)} -> ${JSON.stringify(newHardStages)}`);
        updatedCount++;
      }
    }

    console.log(`\n✅ Successfully reset ${updatedCount} users`);
    console.log('Users can now claim the legendary pack reward again when they clear hard stage 10');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

resetHardStage10();
