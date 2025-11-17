// Reset all user cards and decks
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetUserCardsAndDecks() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
  });

  try {
    console.log('🔄 Starting user cards and decks reset...\n');

    // Get user count before reset
    const [usersBefore] = await connection.query('SELECT COUNT(*) as count FROM users');

    // Check which tables exist
    const [tables] = await connection.query("SHOW TABLES LIKE 'user_%'");
    console.log('📋 Available tables:', tables.map(t => Object.values(t)[0]).join(', '));

    let cardsBefore = [{ count: 0 }];
    let decksBefore = [{ count: 0 }];

    try {
      [cardsBefore] = await connection.query('SELECT COUNT(*) as count FROM user_cards');
    } catch (e) {
      console.log('ℹ️  user_cards table not found');
    }

    try {
      [decksBefore] = await connection.query('SELECT COUNT(*) as count FROM decks');
    } catch (e) {
      console.log('ℹ️  decks table not found');
    }

    console.log('📊 Before Reset:');
    console.log(`   Users: ${usersBefore[0].count}`);
    console.log(`   Cards: ${cardsBefore[0].count}`);
    console.log(`   Decks: ${decksBefore[0].count}\n`);

    // Start transaction
    await connection.beginTransaction();

    // 1. Delete all user cards
    try {
      await connection.query('DELETE FROM user_cards');
      console.log('✅ Deleted all user cards');
    } catch (e) {
      console.log('⚠️  user_cards table not found, skipping');
    }

    // 2. Delete all decks (might be 'decks' not 'user_decks')
    try {
      await connection.query('DELETE FROM decks');
      console.log('✅ Deleted all decks');
    } catch (e) {
      console.log('⚠️  decks table not found, skipping');
    }

    // 3. Delete all deck cards (if exists)
    try {
      await connection.query('DELETE FROM deck_cards WHERE 1=1');
      console.log('✅ Deleted all deck cards');
    } catch (e) {
      console.log('⚠️  deck_cards table not found, skipping');
    }

    // 4. Reset user collection progress
    try {
      await connection.query('DELETE FROM user_collected_cards');
      console.log('✅ Deleted collection progress');
    } catch (e) {
      console.log('⚠️  user_collected_cards table not found, skipping');
    }

    try {
      await connection.query('DELETE FROM user_collection_progress');
      console.log('✅ Deleted collection progress stats');
    } catch (e) {
      console.log('⚠️  user_collection_progress table not found, skipping');
    }

    // 5. Reset gacha history (optional - uncomment if needed)
    // try {
    //   await connection.query('DELETE FROM gacha_history');
    //   console.log('✅ Deleted gacha history');
    // } catch (e) {
    //   console.log('⚠️  gacha_history table not found, skipping');
    // }

    // 6. Reset user points to 10000 and reset welcome packs
    try {
      await connection.query('UPDATE users SET points = 10000, welcome_packs_remaining = 5 WHERE is_admin = FALSE OR is_admin IS NULL');
      console.log('✅ Reset user points to 10,000 and welcome packs to 5');
    } catch (e) {
      // Try without welcome_packs_remaining if column doesn't exist
      await connection.query('UPDATE users SET points = 10000 WHERE is_admin = FALSE OR is_admin IS NULL');
      console.log('✅ Reset user points to 10,000');
    }

    // 7. Reset admin points to high value
    try {
      await connection.query('UPDATE users SET points = 999999 WHERE is_admin = TRUE');
      console.log('✅ Reset admin points to 999,999');
    } catch (e) {
      console.log('⚠️  Could not reset admin points');
    }

    // 8. Reset 19G2 gacha pity counter
    try {
      await connection.query('DELETE FROM user_gacha_pity WHERE pack_type = "19G2_PREMIUM"');
      console.log('✅ Reset 19G2 pity counter');
    } catch (e) {
      console.log('⚠️  user_gacha_pity table not found, skipping');
    }

    // Commit transaction
    await connection.commit();

    // Get stats after reset
    const [usersAfter] = await connection.query('SELECT COUNT(*) as count FROM users');

    let cardsAfter = [{ count: 0 }];
    let decksAfter = [{ count: 0 }];

    try {
      [cardsAfter] = await connection.query('SELECT COUNT(*) as count FROM user_cards');
    } catch (e) {}

    try {
      [decksAfter] = await connection.query('SELECT COUNT(*) as count FROM decks');
    } catch (e) {}

    console.log('\n📊 After Reset:');
    console.log(`   Users: ${usersAfter[0].count} (preserved)`);
    console.log(`   Cards: ${cardsAfter[0].count}`);
    console.log(`   Decks: ${decksAfter[0].count}`);

    console.log('\n✅ Reset completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - All user cards deleted');
    console.log('   - All user decks deleted');
    console.log('   - Collection progress reset');
    console.log('   - User points reset to 10,000');
    console.log('   - Welcome packs reset to 5');
    console.log('   - Admin points reset to 999,999');
    console.log('   - 19G2 pity counter reset');
    console.log('\n⚠️  Users can now start fresh with the new gacha system!\n');

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error resetting user cards and decks:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the reset
resetUserCardsAndDecks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
