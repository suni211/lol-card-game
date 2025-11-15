import pool from '../config/database';
import { checkAndUpdateAchievements } from '../utils/achievementTracker';

async function updateAllUserAchievements() {
  const connection = await pool.getConnection();

  try {
    console.log('🔄 Starting achievement update for all users...');

    // Get all users
    const [users]: any = await connection.query('SELECT id, username FROM users');

    console.log(`📊 Found ${users.length} users to update`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`   Updating achievements for user: ${user.username} (ID: ${user.id})`);
        await checkAndUpdateAchievements(user.id);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error updating user ${user.username}:`, error);
        errorCount++;
      }
    }

    console.log('\n✅ Achievement update completed!');
    console.log(`   Success: ${successCount} users`);
    console.log(`   Errors: ${errorCount} users`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

// Run the update
updateAllUserAchievements();
