import Imap from 'imap';
import dotenv from 'dotenv';

dotenv.config();

const email = process.env.EMAIL_FORWARDING_EMAIL;
const password = process.env.EMAIL_FORWARDING_PASSWORD;
const forwardLabel = process.env.EMAIL_FORWARDING_FORWARD_LABEL;

console.log('🧪 Testing Full Email Forwarding Flow...');
console.log(`📧 Email: ${email}`);
console.log(`🏷️ Label: ${forwardLabel}`);
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
  process.exit(1);
});

imap.on('ready', () => {
  console.log('✅ Connected to Gmail IMAP');
  
  // List all mailboxes (which includes Gmail labels)
  imap.getBoxes((err, boxes) => {
    if (err) {
      console.error('❌ Error getting mailboxes:', err.message);
      imap.end();
      process.exit(1);
      return;
    }

    console.log('\n📂 Available Mailboxes/Labels:');
    const allBoxes = Object.keys(boxes);
    allBoxes.forEach(name => console.log(`   ${name}`));

    console.log(`\n🔍 Looking for "${forwardLabel}" label...`);
    
    const labelName = forwardLabel; // The key IS the mailbox name in Gmail

    if (allBoxes.includes(labelName)) {
      console.log(`✅ Found label: "${labelName}"`);
      
      // Now open that mailbox and search for emails
      imap.openBox(labelName, false, (err, box) => {
        if (err) {
          console.error('❌ Error opening label:', err.message);
          imap.end();
          process.exit(1);
          return;
        }

        console.log(`✅ Label mailbox opened - ${box.messages} message(s) with label`);
        
        if (box.messages === 0) {
          console.log(`\n💡 No emails in the "${labelName}" label yet.`);
          console.log(`   To test forwarding:`);
          console.log(`   1. Send a test email to ${email}`);
          console.log(`   2. Label it with "${forwardLabel}"`);
          console.log(`   3. Service will forward it automatically`);
        }
        
        imap.end();
        process.exit(0);
      });
    } else {
      console.log(`❌ Label "${forwardLabel}" not found!`);
      console.log(`\n📋 All available labels:`);
      allBoxes.forEach(name => console.log(`   - ${name}`));
      
      console.log(`\n💡 Create the label in Gmail first, or use a different label name in .env`);
      imap.end();
      process.exit(1);
    }
  });
});


imap.on('end', () => {
  console.log('🔌 Connection closed');
});

console.log('Connecting to Gmail...');
imap.connect();

// Timeout after 20 seconds
setTimeout(() => {
  console.error('⏱️ Operation timeout');
  imap.end();
  process.exit(1);
}, 20000);
