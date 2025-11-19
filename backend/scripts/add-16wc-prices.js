// Add market prices for 16WC players
const mysql = require('mysql2/promise');
require('dotenv').config();

async function add16WCPrices() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
  });

  try {
    console.log('🔄 Adding market prices for 16WC players...\n');

    await connection.beginTransaction();

    // Get all 16WC players without prices
    const [wcPlayers] = await connection.query(`
      SELECT p.id, p.name, p.overall
      FROM players p
      LEFT JOIN player_market_prices pmp ON p.id = pmp.player_id
      WHERE p.season = '16WC' AND pmp.player_id IS NULL
    `);

    console.log(`📊 Found ${wcPlayers.length} 16WC players without prices\n`);

    let addedCount = 0;

    for (const player of wcPlayers) {
      const basePrice = Math.floor(player.overall * 60);
      const priceFloor = Math.floor(player.overall * 45);
      const priceCeiling = Math.floor(player.overall * 90);

      // Insert new price
      await connection.query(`
        INSERT INTO player_market_prices (player_id, base_price, current_price, price_floor, price_ceiling)
        VALUES (?, ?, ?, ?, ?)
      `, [player.id, basePrice, basePrice, priceFloor, priceCeiling]);

      console.log(`✅ Added ${player.name} (${player.overall} OVR) - ${basePrice}P`);
      addedCount++;
    }

    await connection.commit();

    console.log('\n✅ 16WC market prices added successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - Total players added: ${addedCount}`);
    console.log(`   - Pricing formula: overall * 60`);
    console.log(`   - Price range: overall * 45 ~ overall * 90\n`);

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error adding 16WC prices:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

add16WCPrices().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
