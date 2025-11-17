// Generate bcrypt hash for admin password
const bcrypt = require('bcrypt');

const password = 'admin123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }

  console.log('Password: admin123');
  console.log('Bcrypt Hash:');
  console.log(hash);
  console.log('\nUse this hash in create_admin.sql');
});
