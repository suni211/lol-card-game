/**
 * Create moba_champion_stats and moba_match_history tables
 * Run with: node create-moba-stats-tables.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lol_card_game'
};

async function createMobaStatsTables() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Create moba_champion_stats table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS moba_champion_stats (
        champion_id INT NOT NULL,
        pick_count INT NOT NULL DEFAULT 0,
        ban_count INT NOT NULL DEFAULT 0,
        win_count INT NOT NULL DEFAULT 0,
        PRIMARY KEY (champion_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ moba_champion_stats table created successfully!');

    // Create moba_match_history table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS moba_match_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        match_id VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ moba_match_history table created successfully!');

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

createMobaStatsTables();
