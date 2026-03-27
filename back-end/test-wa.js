import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

console.log("Starting whatsapp-web.js test...");

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }
});

client.on('qr', (qr) => {
  console.log('QR RECEIVED', qr);
  process.exit(0);
});

client.on('ready', () => {
  console.log('Client is ready!');
  process.exit(0);
});

client.on('auth_failure', (msg) => {
  console.error('AUTHENTICATION FAILURE', msg);
  process.exit(1);
});

client.initialize().catch(err => {
  console.error("Initialization error:", err);
  process.exit(1);
});
