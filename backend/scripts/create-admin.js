// Fresh launch: administrator credentials must be explicitly supplied.
// Usage: ADMIN_USERNAME=owner ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='...' node scripts/create-admin.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !email || !password || password.length < 12) {
    throw new Error('Set ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD (at least 12 characters).');
  }
  if (!/^[a-zA-Z0-9_]{3,40}$/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid admin username or email');
  }
  const cx = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
  });
  try {
    await cx.beginTransaction();
    const [existing] = await cx.query('SELECT id FROM users WHERE username=? OR email=?', [username,email]);
    if (existing.length) throw new Error('Username/email already exists. No existing account was overwritten.');
    const hash = await bcrypt.hash(password, 12);
    const [created] = await cx.query(
      'INSERT INTO users (username,email,password,points,tier,rating,is_admin) VALUES (?,?,?,1000,\'IRON\',1000,TRUE)',
      [username,email,hash]);
    await cx.query('INSERT INTO user_stats (user_id) VALUES (?)',[created.insertId]);
    await cx.commit();
    console.log('New administrator created:',username,'(id:',created.insertId,')');
  } catch(error) {
    await cx.rollback();
    throw error;
  } finally {
    await cx.end();
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
