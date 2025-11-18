// Update existing 18WC market prices to correct values
const mysql = require('mysql2/promise');
require('dotenv').config();

async function update18WCPrices() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
  });

  try {
    console.log('🔄 Updating 18WC market prices to correct values...\n');

    await connection.beginTransaction();

    // Get all 18WC players with their current prices
    const [wcPlayers] = await connection.query(`
      SELECT p.id, p.name, p.overall, pmp.base_price as old_price
      FROM players p
      LEFT JOIN player_market_prices pmp ON p.id = pmp.player_id
      WHERE p.season = '18WC'
    `);

    console.log(`📊 Found ${wcPlayers.length} 18WC players\n`);

    let updatedCount = 0;

    for (const player of wcPlayers) {
      const newBasePrice = Math.floor(player.overall * 200);
      const newPriceFloor = Math.floor(player.overall * 150);
      const newPriceCeiling = Math.floor(player.overall * 300);

      // Update existing price
      await connection.query(`
        UPDATE player_market_prices
        SET base_price = ?, current_price = ?, price_floor = ?, price_ceiling = ?
        WHERE player_id = ?
      `, [newBasePrice, newBasePrice, newPriceFloor, newPriceCeiling, player.id]);

      console.log(`✅ Updated ${player.name} (${player.overall} OVR) - ${player.old_price || 0}P → ${newBasePrice}P`);
      updatedCount++;
    }

    await connection.commit();

    console.log('\n✅ 18WC market prices updated successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - Total players updated: ${updatedCount}`);
    console.log(`   - New pricing: overall * 200 (was overall * 10)`);
    console.log(`   - Price range: overall * 150 ~ overall * 300\n`);

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error updating 18WC prices:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

update18WCPrices().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
