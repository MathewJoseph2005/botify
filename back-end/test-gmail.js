import Imap from 'imap';
import dotenv from 'dotenv';

dotenv.config();

const email = process.env.EMAIL_FORWARDING_EMAIL;
const password = process.env.EMAIL_FORWARDING_PASSWORD;

console.log('🧪 Testing Gmail IMAP Authentication...');
console.log(`Email: ${email}`);
console.log(`Password length: ${password?.length || 0} characters`);
console.log();

const imap = new Imap({
  user: email,
  password: password,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { 
    rejectUnauthorized: false,
  },
  connTimeout: 15000,
  authTimeout: 15000,
});

imap.on('error', (err) => {
  console.error('❌ IMAP Error:', err.message);
  console.error('Error code:', err.code);
  console.error('Full error:', err);
  process.exit(1);
});

imap.on('ready', () => {
  console.log('✅ Successfully connected to Gmail IMAP!');
  console.log('📌 Your Gmail credentials are working correctly.');
  imap.end();
  process.exit(0);
});

imap.on('end', () => {
  console.log('🔌 Connection closed');
});

console.log('Attempting to connect...');
imap.connect();

// Timeout after 20 seconds
setTimeout(() => {
  console.error('⏱️ Connection timeout - Gmail not responding');
  imap.end();
  process.exit(1);
}, 20000);
