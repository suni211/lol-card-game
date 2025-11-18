// Fix 18WC market prices - add missing players to market
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix18WCMarketPrices() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
  });

  try {
    console.log('🔄 Fixing 18WC market prices...\n');

    await connection.beginTransaction();

    // Get all 18WC players
    const [wcPlayers] = await connection.query(`
      SELECT id, name, overall, position, team
      FROM players
      WHERE season = '18WC'
    `);

    console.log(`📊 Found ${wcPlayers.length} 18WC players\n`);

    if (wcPlayers.length === 0) {
      console.log('⚠️  No 18WC players found.');
      await connection.rollback();
      return;
    }

    let addedCount = 0;
    let existingCount = 0;

    for (const player of wcPlayers) {
      // Check if price already exists
      const [existing] = await connection.query(
        'SELECT id FROM player_market_prices WHERE player_id = ?',
        [player.id]
      );

      if (existing.length > 0) {
        existingCount++;
        continue;
      }

      // Calculate base price based on overall
      const basePrice = Math.floor(player.overall * 10);
      const priceFloor = Math.floor(basePrice * 0.5);
      const priceCeiling = Math.floor(basePrice * 2);

      // Add to market prices
      await connection.query(`
        INSERT INTO player_market_prices (player_id, current_price, price_floor, price_ceiling, total_volume, last_traded_at)
        VALUES (?, ?, ?, ?, 0, NULL)
      `, [player.id, basePrice, priceFloor, priceCeiling]);

      console.log(`✅ Added ${player.name} (${player.overall} OVR) - Price: ${basePrice}P (${priceFloor}P ~ ${priceCeiling}P)`);
      addedCount++;
    }

    await connection.commit();

    console.log('\n✅ 18WC market prices fixed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - Total 18WC players: ${wcPlayers.length}`);
    console.log(`   - Already had prices: ${existingCount}`);
    console.log(`   - Newly added: ${addedCount}`);
    console.log('\n✨ 18WC cards can now be traded on the market!\n');

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error fixing 18WC market prices:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

fix18WCMarketPrices().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
