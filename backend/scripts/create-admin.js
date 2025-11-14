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
    const adminPassword = 'ss092888?';

    // Check if admin already exists
    const [existingAdmin] = await connection.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [adminEmail, adminUsername]
    );

    if (existingAdmin.length > 0) {
      console.log('❌ Admin account already exists!');
      await connection.end();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

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
    console.log('📧 Email:', adminEmail);
    console.log('👤 Username:', adminUsername);
    console.log('🔑 Password: ss092888?');
    console.log('');
    console.log('⚠️  Please keep these credentials safe!');

  } catch (error) {
    console.error('❌ Error creating admin account:', error);
  } finally {
    await connection.end();
  }
}

createAdmin();
