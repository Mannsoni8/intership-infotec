// Creates server/.env with a random JWT secret (run once: npm run setup)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '..', 'server', '.env');

if (fs.existsSync(envPath)) {
  console.log('server/.env already exists - nothing to do.');
  process.exit(0);
}

const secret = crypto.randomBytes(48).toString('hex'); // 96 random characters
const content = [
  'PORT=5000',
  'MONGO_URI=mongodb://127.0.0.1:27017/syncdoc',
  'CLIENT_ORIGIN=http://localhost:5173',
  `JWT_SECRET=${secret}`,
  '',
].join('\n');

fs.writeFileSync(envPath, content, { mode: 0o600 });
console.log('Created server/.env with a new random JWT_SECRET.');
console.log('Check MONGO_URI in that file, then run: npm run seed');
