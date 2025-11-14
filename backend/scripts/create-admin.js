// Create admin account script
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAdmin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
  });

  try {
    // Admin credentials
    const adminEmail = 'admin@berrple.com';
    const adminUsername = 'admin';
    const adminPassword = 'admin123';

    // Check if admin already exists
    const [existingAdmin] = await connection.query(
      'SELECT id, username, email, is_admin FROM users WHERE email = ? OR username = ?',
      [adminEmail, adminUsername]
    );

    if (existingAdmin.length > 0) {
      console.log('⚠️  Admin account already exists:');
      console.table(existingAdmin);
      console.log('');
      console.log('Deleting and recreating...');

      // Delete existing admin
      await connection.query(
        'DELETE FROM users WHERE email = ? OR username = ?',
        [adminEmail, adminUsername]
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user (removed is_email_verified as it doesn't exist in schema)
    const [result] = await connection.query(
      `INSERT INTO users
      (username, email, password, registration_ip, points, tier, rating, is_admin)
      VALUES (?, ?, ?, '127.0.0.1', 999999, 'CHALLENGER', 9999, TRUE)`,
      [adminUsername, adminEmail, hashedPassword]
    );

    const userId = result.insertId;

    // Create user stats for admin
    await connection.query(
      `INSERT INTO user_stats (user_id, total_matches, wins, losses, current_streak, longest_win_streak)
       VALUES (?, 0, 0, 0, 0, 0)
       ON DUPLICATE KEY UPDATE user_id = user_id`,
      [userId]
    );

    console.log('✅ Admin account created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    admin@berrple.com');
    console.log('👤 Username: admin');
    console.log('🔑 Password: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('⚠️  Please keep these credentials safe!');

    // Verify
    const [verify] = await connection.query(
      'SELECT id, username, email, is_admin, points, rating, tier FROM users WHERE id = ?',
      [userId]
    );
    console.log('');
    console.log('Verified account:');
    console.table(verify);

  } catch (error) {
    console.error('❌ Error creating admin account:', error);
  } finally {
    await connection.end();
  }
}

createAdmin();
