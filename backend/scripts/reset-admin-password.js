// Reset admin account password
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetAdminPassword() {
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
    const newPassword = 'ss092888?';

    // Check if admin exists
    const [existingAdmin] = await connection.query(
      'SELECT id, username, email FROM users WHERE email = ? OR username = ?',
      [adminEmail, adminUsername]
    );

    if (existingAdmin.length === 0) {
      console.log('❌ Admin account not found! Creating new admin account...');

      // Hash password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Create admin user
      const [result] = await connection.query(
        `INSERT INTO users
        (username, email, password, registration_ip, points, tier, rating, is_admin, is_email_verified)
        VALUES (?, ?, ?, '127.0.0.1', 999999, 'CHALLENGER', 9999, TRUE, TRUE)`,
        [adminUsername, adminEmail, hashedPassword]
      );

      const userId = result.insertId;

      // Create user stats for admin
      await connection.query(
        'INSERT INTO user_stats (user_id) VALUES (?)',
        [userId]
      );

      console.log('✅ Admin account created successfully!');
    } else {
      console.log('✅ Admin account found:', existingAdmin[0].username);

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update admin password
      await connection.query(
        'UPDATE users SET password = ?, is_admin = TRUE, is_email_verified = TRUE WHERE id = ?',
        [hashedPassword, existingAdmin[0].id]
      );

      console.log('✅ Admin password reset successfully!');
    }

    console.log('');
    console.log('📧 Email:', adminEmail);
    console.log('👤 Username:', adminUsername);
    console.log('🔑 Password:', newPassword);
    console.log('');
    console.log('⚠️  You can now login with these credentials!');

  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
  } finally {
    await connection.end();
  }
}

resetAdminPassword();
