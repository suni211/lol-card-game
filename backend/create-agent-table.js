/**
 * Create agent_usage table
 * Run with: node create-agent-table.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lol_card_game'
};

async function createAgentTable() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Create agent_usage table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS agent_usage (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        agent_type ENUM('daily', 'weekly', 'monthly') NOT NULL,
        last_used DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_agent (user_id, agent_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ agent_usage table created successfully!');

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

createAgentTable();
