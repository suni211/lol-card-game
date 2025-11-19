// Update Campaign Power Requirements for LEC and LPL
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateCampaignPower() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
  });

  try {
    console.log('🔧 Updating Campaign Power Requirements...\n');

    await connection.beginTransaction();

    // Update LEC stages (600 + (stage_number-1) * 30)
    console.log('📍 Updating LEC power requirements (800 → 600)...');
    for (let i = 1; i <= 30; i++) {
      const newPower = 600 + (i - 1) * 30;
      await connection.query(
        'UPDATE campaign_stages SET required_power = ? WHERE region = ? AND stage_number = ?',
        [newPower, 'LEC', i]
      );
    }

    // Update LPL stages (650 + (stage_number-1) * 40)
    console.log('📍 Updating LPL power requirements (1100 → 650)...');
    for (let i = 1; i <= 30; i++) {
      const newPower = 650 + (i - 1) * 40;
      await connection.query(
        'UPDATE campaign_stages SET required_power = ? WHERE region = ? AND stage_number = ?',
        [newPower, 'LPL', i]
      );
    }

    await connection.commit();

    console.log('\n✅ Power requirements updated successfully!');
    console.log('\n📝 New Power Progression:');
    console.log('   - LCP: 300-880 (EASY)');
    console.log('   - LTA: 550-1275 (NORMAL)');
    console.log('   - LEC: 600-1470 (HARD) ✓ Updated');
    console.log('   - LPL: 650-1810 (HELL) ✓ Updated');
    console.log('   - LCK: 700-1860 (HELL - 최고 보상)\n');

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error updating campaign power:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

updateCampaignPower().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
