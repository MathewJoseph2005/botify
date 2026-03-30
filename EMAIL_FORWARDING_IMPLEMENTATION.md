# Email Forwarding Bot - Implementation Guide

## 🚨 IMPORTANT: Uses Separate Supabase Account

This feature uses a **COMPLETELY SEPARATE Supabase project** from your main Botify account.

**Setup Overview**:
1. Create a new Supabase project (different from main Botify project)
2. Get credentials: URL and service key
3. Add to `.env` as `EMAIL_FORWARDING_SUPABASE_URL` and `EMAIL_FORWARDING_SUPABASE_SERVICE_KEY`
4. Backend automatically uses separate database client for all email forwarding operations
5. No conflicts with existing features

---

## Overview
This guide provides step-by-step instructions to complete the Email Forwarding Bot feature. The feature has been partially implemented (frontend UI and API routes are complete) but requires database schema setup and background job implementation.

---

## Phase 1: Database Setup ✅ (95% Complete)

### What's Needed:
1. Create a **new, separate Supabase project** for email forwarding
2. Execute SQL migrations in the new account
3. Get credentials and add to `.env`
4. Verify table creation

### Instructions:

**Step 1: Create New Supabase Project**
1. Go to https://app.supabase.com
2. Click "New Project"
3. Choose your organization and region
4. Create the project (this is your EMAIL FORWARDING account - separate from main Botify)

**Step 2: Set Up Database (in NEW Email Forwarding Supabase account)**
1. In your new Supabase project, open "SQL Editor" → "New Query"
2. Copy SQL from `SUPABASE_EMAIL_FORWARDING_SETUP.md` (main table section)
3. Click "Run" to execute
4. Verify in "Table Editor" that `email_forwarding_configs` appears

**Step 3: Get Credentials**
1. In your EMAIL FORWARDING Supabase project → Settings → API Keys
2. Copy the **Project URL** → Add to `.env` as `EMAIL_FORWARDING_SUPABASE_URL`
3. Copy the **service_role key** → Add to `.env` as `EMAIL_FORWARDING_SUPABASE_SERVICE_KEY`

**Step 4: Verify Backend Configuration**
- Backend now has TWO database clients:
  - `back-end/config/database.js` → Main Botify (users, bots, etc.)
  - `back-end/config/emailForwardingDatabase.js` → Email Forwarding ONLY
- Routes automatically use the correct client
- No conflicts possible

**Verification Checklist:**
- [ ] Created separate Supabase project (NOT main Botify account)
- [ ] Table `email_forwarding_configs` exists in NEW account
- [ ] Table has all 14 columns
- [ ] Indexes created on user_id and enabled/last_check_at
- [ ] RLS policies are active in NEW account
- [ ] `EMAIL_FORWARDING_SUPABASE_URL` in `.env`
- [ ] `EMAIL_FORWARDING_SUPABASE_SERVICE_KEY` in `.env`
- [ ] MAIN Supabase credentials still work (unchanged)

### What's Needed:
1. Create email scanning service
2. Implement IMAP integration
3. Set up node-schedule for periodic tasks
4. Add environment variables

### Step 1: Install Required Packages

```bash
cd back-end
npm install imap node-schedule mailparser
npm install --save-dev # if not already installed
```

**Packages Explained:**
- `imap`: Protocol client for reading emails from IMAP servers
- `node-schedule`: Cron-like task scheduler for Node.js
- `mailparser`: Parse email content (headers, body, attachments)

### Step 2: Create Email Forwarding Service

Create file: `back-end/services/EmailForwardingService.js`

```javascript
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import schedule from 'node-schedule';
import emailForwardingSupabase from '../config/emailForwardingDatabase.js'; // ← Uses SEPARATE account

class EmailForwardingService {
  constructor() {
    this.job = null;
    this.scanning = false;
  }

  /**
   * Start the email forwarding scheduler
   * Runs every 5 minutes to check for emails with forwarding labels
   */
  start() {
    if (this.job) {
      console.log('[EmailForwarding] Service already running');
      return;
    }

    // Run every 5 minutes
    this.job = schedule.scheduleJob('*/5 * * * *', async () => {
      if (this.scanning) {
        console.log('[EmailForwarding] Scan already in progress, skipping...');
        return;
      }
      
      try {
        await this.scanAllConfigs();
      } catch (error) {
        console.error('[EmailForwarding] Scheduled scan failed:', error.message);
      }
    });

    console.log('[EmailForwarding] Service started - scanning every 5 minutes');
  }

  /**
   * Stop the email forwarding scheduler
   */
  stop() {
    if (this.job) {
      this.job.cancel();
      this.job = null;
      console.log('[EmailForwarding] Service stopped');
    }
  }

  /**
   * Scan all enabled forwarding configurations
   */
  async scanAllConfigs() {
    this.scanning = true;
    const startTime = new Date();
    
    try {
      const { data: configs, error } = await emailForwardingSupabase // ← Uses SEPARATE account
        .from('email_forwarding_configs')
        .select('*')
        .eq('enabled', true);

      if (error) {
        console.error('[EmailForwarding] Error fetching configs:', error.message);
        return;
      }

      if (!configs || configs.length === 0) {
        console.log('[EmailForwarding] No enabled configurations to scan');
        return;
      }

      console.log(`[EmailForwarding] Starting scan of ${configs.length} configurations`);

      for (const config of configs) {
        try {
          await this.processConfig(config);
        } catch (error) {
          console.error(`[EmailForwarding] Error processing config ${config.id}:`, error.message);
          // Continue to next config on error
        }
      }

      console.log(`[EmailForwarding] Scan completed in ${Date.now() - startTime}ms`);
    } finally {
      this.scanning = false;
    }
  }

  /**
   * Process a single email forwarding configuration
   * @param {Object} config - Configuration from database
   */
  async processConfig(config) {
    console.log(`[EmailForwarding] Processing config ${config.id} (${config.email})`);

    // Create IMAP connection
    const imap = new Imap({
      user: config.email,
      password: config.password, // NOTE: Consider decrypting if stored encrypted
      host: this.getImapHost(config.email),
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 10000,
    });

    return new Promise((resolve, reject) => {
      imap.on('error', (error) => {
        console.error(`[EmailForwarding] IMAP error for ${config.id}:`, error.message);
        reject(error);
      });

      imap.on('end', () => {
        console.log(`[EmailForwarding] IMAP connection closed for config ${config.id}`);
        resolve();
      });

      imap.openBox('INBOX', false, async (error, box) => {
        if (error) {
          console.error(`[EmailForwarding] Error opening inbox for ${config.id}:`, error.message);
          imap.end();
          reject(error);
          return;
        }

        try {
          // Search for emails with the specified label
          // Gmail uses X-GM-LABELS for label search
          const searchQuery = this.buildSearchQuery(config.forward_label);
          const results = await this.searchEmails(imap, searchQuery);

          if (results.length === 0) {
            console.log(`[EmailForwarding] No emails with label "${config.forward_label}" found for config ${config.id}`);
            
            // Update last_check_at
            await this.updateConfig(config.id, {
              emails_checked: (config.emails_checked || 0) + 1,
              last_check_at: new Date().toISOString(),
            });

            imap.end();
            resolve();
            return;
          }

          console.log(`[EmailForwarding] Found ${results.length} emails for config ${config.id}`);

          // Process each email
          let forwarded = 0;
          for (const uid of results) {
            try {
              const forwarded_this_email = await this.forwardEmail(imap, config, uid);
              if (forwarded_this_email) forwarded++;
            } catch (error) {
              console.error(`[EmailForwarding] Error forwarding email for config ${config.id}:`, error.message);
              // Log error but continue
              await this.logForwardingAction(config.id, config.user_id, {
                status: 'failed',
                error_message: error.message,
              });
            }
          }

          // Update statistics
          await this.updateConfig(config.id, {
            emails_checked: (config.emails_checked || 0) + results.length,
            emails_forwarded: (config.emails_forwarded || 0) + forwarded,
            last_check_at: new Date().toISOString(),
          });

          console.log(`[EmailForwarding] Config ${config.id}: checked ${results.length}, forwarded ${forwarded}`);
          imap.end();
          resolve();
        } catch (error) {
          console.error(`[EmailForwarding] Error processing config ${config.id}:`, error.message);
          imap.end();
          reject(error);
        }
      });

      imap.connect();
    });
  }

  /**
   * Retrieve and forward a single email
   * @returns {boolean} Whether email was successfully forwarded
   */
  async forwardEmail(imap, config, uid) {
    return new Promise((resolve, reject) => {
      const f = imap.fetch(uid, { bodies: '' });

      f.on('message', (msg) => {
        simpleParser(msg, async (err, parsed) => {
          if (err) {
            reject(err);
            return;
          }

          try {
            // Create transporter for sending
            const transporter = nodemailer.createTransport(this.getSmtpConfig(config.email, config.password));

            // Prepare forwarded email
            const mailOptions = {
              from: config.email,
              to: config.recipient_emails.join(','),
              subject: `[Forwarded] ${parsed.subject || '(no subject)'}`,
              html: `
                <p><strong>Originally from:</strong> ${parsed.from?.text || 'unknown'}</p>
                <p><strong>Date:</strong> ${parsed.date || 'unknown'}</p>
                <hr />
                ${parsed.html || parsed.text || ''}
              `,
              text: `Originally from: ${parsed.from?.text || 'unknown'}\nDate: ${parsed.date || 'unknown'}\n\n${parsed.text || ''}`,
            };

            // Send email
            await transporter.sendMail(mailOptions);
            console.log(`[EmailForwarding] Email forwarded: "${parsed.subject}" to ${config.recipient_emails.length} recipient(s)`);

            // Log successful forward
            await this.logForwardingAction(config.id, config.user_id, {
              email_from: parsed.from?.text || null,
              email_subject: parsed.subject || null,
              recipients_count: config.recipient_emails.length,
              status: 'success',
            });

            // Mark as processed (add processed label or archive)
            // For Gmail, you can add a label. For other providers, move to archive.
            // This is optional - remove if you want to keep originals
            // imap.addFlags(uid, ['\\Seen'], (err) => {
            //   if (err) console.error('[EmailForwarding] Error marking as seen:', err.message);
            //   resolve(true);
            // });

            resolve(true);
          } catch (error) {
            console.error('[EmailForwarding] Error sending forwarded email:', error.message);
            await this.logForwardingAction(config.id, config.user_id, {
              email_from: parsed.from?.text || null,
              email_subject: parsed.subject || null,
              status: 'failed',
              error_message: error.message,
            });
            reject(error);
          }
        });
      });

      f.on('error', reject);
    });
  }

  /**
   * Build IMAP search query based on provider
   */
  buildSearchQuery(label) {
    // Gmail supports X-GM-LABELS
    // For other providers, you might use KEYWORD instead
    return [`X-GM-LABELS ${label}`];
  }

  /**
   * Search for emails matching query
   */
  searchEmails(imap, query) {
    return new Promise((resolve, reject) => {
      imap.search(query, (error, results) => {
        if (error) reject(error);
        else resolve(results || []);
      });
    });
  }

  /**
   * Update configuration statistics
   */
  async updateConfig(configId, updates) {
    const { error } = await emailForwardingSupabase // ← Uses SEPARATE account
      .from('email_forwarding_configs')
      .update(updates)
      .eq('id', configId);

    if (error) {
      console.error(`[EmailForwarding] Error updating config ${configId}:`, error.message);
    }
  }

  /**
   * Log a forwarding action
   */
  async logForwardingAction(configId, userId, action) {
    const { error } = await emailForwardingSupabase // ← Uses SEPARATE account
      .from('email_forwarding_logs')
      .insert([
        {
          config_id: configId,
          user_id: userId,
          ...action,
        },
      ]);

    if (error) {
      console.error('[EmailForwarding] Error logging action:', error.message);
    }
  }

  /**
   * Get IMAP host for email provider
   */
  getImapHost(email) {
    if (email.includes('@gmail.com')) return 'imap.gmail.com';
    if (email.includes('@outlook.com')) return 'imap-mail.outlook.com';
    if (email.includes('@yahoo.com')) return 'imap.mail.yahoo.com';
    if (email.includes('@hotmail.com')) return 'imap-mail.outlook.com';
    // Default: attempt to use imap prefix
    const domain = email.split('@')[1];
    return `imap.${domain}`;
  }

  /**
   * Get SMTP configuration for email provider
   */
  getSmtpConfig(email, password) {
    if (email.includes('@gmail.com')) {
      return {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: email,
          pass: password,
        },
      };
    }

    if (email.includes('@outlook.com') || email.includes('@hotmail.com')) {
      return {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: {
          user: email,
          pass: password,
        },
      };
    }

    if (email.includes('@yahoo.com')) {
      return {
        host: 'smtp.mail.yahoo.com',
        port: 587,
        secure: false,
        auth: {
          user: email,
          pass: password,
        },
      };
    }

    // Generic SMTP
    const domain = email.split('@')[1];
    return {
      host: `smtp.${domain}`,
      port: 587,
      secure: false,
      auth: {
        user: email,
        pass: password,
      },
    };
  }
}

// Export singleton instance
export default new EmailForwardingService();
```

### Step 3: Integrate into Server Startup

Edit `back-end/server.js` to start the service:

```javascript
import EmailForwardingService from './services/EmailForwardingService.js';

// ... existing imports and setup ...

// Start email forwarding service
EmailForwardingService.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  EmailForwardingService.stop();
  // ... other cleanup ...
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  EmailForwardingService.stop();
  // ... other cleanup ...
  process.exit(0);
});

// ... rest of server code ...
```

### Step 4: Environment Variables

Add to `.env` (these are for the SEPARATE Email Forwarding Supabase account):

```env
# ─────────────────────────────────────────────────────────────────────────
# Email Forwarding Supabase Account (SEPARATE from main Botify account)
# ─────────────────────────────────────────────────────────────────────────
EMAIL_FORWARDING_SUPABASE_URL=https://your-email-forwarding-project.supabase.co
EMAIL_FORWARDING_SUPABASE_SERVICE_KEY=eyJhbG...  # service_role key for email forwarding account

# Optional: Password encryption for stored email credentials
ENCRYPTION_KEY=your-32-char-hex-key-here
# Generate with: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Email Forwarding Scheduler
EMAIL_FORWARDING_CHECK_INTERVAL=5  # Minutes between scans
```

✅ **Make sure**:
- `EMAIL_FORWARDING_SUPABASE_URL` is from your SEPARATE Email Forwarding Supabase project
- `EMAIL_FORWARDING_SUPABASE_SERVICE_KEY` is the service_role key from the SEPARATE project
- Do NOT use your main Botify Supabase URLs/keys for these variables

---

## Phase 3: Testing ⏳ (Not Started)

### Test Database Setup

```bash
# Test Supabase connection
curl -X GET http://localhost:5000/api/health \
  -H "Authorization: Bearer <token>"
```

### Test API Endpoints

**Create Configuration:**
```bash
curl -X POST http://localhost:5000/api/bot/email-forwarding \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Support Team Forwarder",
    "description": "Forward support@ emails to team",
    "email": "support@example.com",
    "password": "app-specific-password",
    "forward_label": "forward",
    "recipient_emails": ["team@company.com", "manager@company.com"],
    "enabled": true
  }'
```

Expected Response:
```json
{
  "success": true,
  "config": {
    "id": 1,
    "user_id": 123,
    "name": "Support Team Forwarder",
    "email": "support@example.com",
    "forward_label": "forward",
    "recipient_emails": ["team@company.com", "manager@company.com"],
    "emails_checked": 0,
    "emails_forwarded": 0,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Email forwarding config created."
}
```

**List Configurations:**
```bash
curl -X GET http://localhost:5000/api/bot/email-forwarding \
  -H "Authorization: Bearer <your-jwt-token>"
```

**Test Email Connection:**
```bash
curl -X POST http://localhost:5000/api/bot/email-forwarding/1/test \
  -H "Authorization: Bearer <your-jwt-token>"
```

Expected Response:
```json
{
  "success": true,
  "connected": true,
  "message": "Connection to email server successful"
}
```

### Monitor Logs

```bash
# Watch backend logs
npm run dev  # In back-end directory

# You should see logs like:
# [EmailForwarding] Service started - scanning every 5 minutes
# [EmailForwarding] Starting scan of 2 configurations
# [EmailForwarding] Processing config 1 (support@example.com)
# [EmailForwarding] Found 3 emails for config 1
# [EmailForwarding] Email forwarded: "Client Request" to 2 recipient(s)
```

---

## Phase 4: Security Hardening ⏳ (Not Started)

### Password Encryption

Currently passwords are stored in plaintext. Implement encryption:

1. **Option A: Encrypt on Save (Recommended)**

Edit `back-end/routes/bot.js`:

```javascript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ('0'.repeat(64)); // 32 bytes

function encryptPassword(password) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(password, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptPassword(encryptedPassword) {
  const [iv, encrypted] = encryptedPassword.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

// In POST /email-forwarding:
const encryptedPassword = encryptPassword(req.body.password);
// Insert with encryptedPassword instead of plain password

// In EmailForwardingService.js:
const decryptedPassword = decryptPassword(config.password);
// Use decryptedPassword for IMAP/SMTP
```

2. **Option B: Use Third-Party Secrets Manager**

Consider AWS Secrets Manager, HashiCorp Vault, or similar for production.

---

## Completion Checklist

- [ ] **Database**: Execute email-forwarding-migration.sql in Supabase
- [ ] **Backend**: Create EmailForwardingService.js
- [ ] **Dependencies**: Installed imap, node-schedule, mailparser
- [ ] **Integration**: Added service.start() to server.js
- [ ] **Testing**: Tested all 5 API endpoints
- [ ] **Monitoring**: Verified logs showing scheduler running
- [ ] **Security**: Implemented password encryption
- [ ] **Documentation**: Updated README with feature description

---

## Troubleshooting

### Service Not Starting?
Check:
1. All packages installed: `npm list imap node-schedule mailparser`
2. Server logs for import errors
3. Supabase connection working

### No Emails Being Forwarded?
Check:
1. Email label matches exactly (Gmail is case-sensitive)
2. IMAP is enabled on email account
3. App-specific password is correct (not account password)
4. Create test emails with the label manually
5. Check logs for IMAP connection errors

### Performance Issues?
Options:
1. Increase scan interval: Change `'*/5 * * * *'` to `'*/15 * * * *'` (every 15 minutes)
2. Limit concurrent connections per config
3. Implement connection pooling
4. Monitor database query performance

---

## References

- [IMAP Protocol Docs](https://tools.ietf.org/html/rfc3501)
- [Gmail IMAP Labels](https://support.google.com/mail/answer/7126229)
- [Node-schedule Cron Syntax](https://github.com/node-schedule/node-schedule#cron-style-scheduling)
- [Mailparser Docs](https://nodemailer.com/extras/mailparser/)
- [Nodemailer SMTP Config](https://nodemailer.com/smtp/)
