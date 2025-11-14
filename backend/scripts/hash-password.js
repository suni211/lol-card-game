const bcrypt = require('bcrypt');

const password = 'ss092888?';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  console.log('Password:', password);
  console.log('Hashed:', hash);
  console.log('\nCopy this hash to the SQL file:');
  console.log(hash);
});
