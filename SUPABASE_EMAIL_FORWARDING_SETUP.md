# Email Forwarding Bot - Supabase Database Setup (Separate Account)

## 🚨 IMPORTANT: Separate Supabase Account Required

This feature uses a **COMPLETELY SEPARATE Supabase project** from your main Botify account.

**DO NOT** use your main Botify Supabase account for email forwarding. Create a new Supabase project specifically for this feature.

### Why Separate?
- ✅ Prevents conflicts with existing features
- ✅ Allows independent scaling and backups
- ✅ Better security and data isolation
- ✅ Easier to disable/modify without affecting core features
- ✅ Separate RLS policies and authentication

### Environment Variables

**Main Botify Account** (existing):
```env
SUPABASE_URL=https://your-main-project.supabase.co
SUPABASE_SERVICE_KEY=eyJob...
```

**Email Forwarding Account** (NEW):
```env
EMAIL_FORWARDING_SUPABASE_URL=https://your-email-forwarding-project.supabase.co
EMAIL_FORWARDING_SUPABASE_SERVICE_KEY=eyJob...
```

---

## Overview
The Email Forwarding Bot feature requires tables in a **separate Supabase PostgreSQL instance** to store email forwarding configurations. This document outlines the complete database schema and setup instructions for the dedicated email forwarding account.

---

## Database Table: `email_forwarding_configs`

### Table Purpose
Stores email forwarding bot configurations created by sellers. Each configuration can automatically monitor email inboxes for messages with a specific label and forward them to specified recipient emails.

### SQL Schema

```sql
-- Create email_forwarding_configs table
CREATE TABLE email_forwarding_configs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  email VARCHAR(255) NOT NULL,
  password TEXT NOT NULL, -- IMPORTANT: Should be encrypted in production!
  forward_label VARCHAR(100) DEFAULT 'forward',
  recipient_emails TEXT[] NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  emails_checked BIGINT DEFAULT 0,
  emails_forwarded BIGINT DEFAULT 0,
  last_check_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for user_id lookups
CREATE INDEX idx_email_forwarding_configs_user_id 
  ON email_forwarding_configs(user_id);

-- Create index for enabled/last_check_at for scheduler queries
CREATE INDEX idx_email_forwarding_configs_enabled_check 
  ON email_forwarding_configs(enabled, last_check_at);

-- Enable RLS (Row Level Security)
ALTER TABLE email_forwarding_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only access their own configs
CREATE POLICY "Users can view their own email forwarding configs" 
  ON email_forwarding_configs 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own email forwarding configs" 
  ON email_forwarding_configs 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own email forwarding configs" 
  ON email_forwarding_configs 
  FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own email forwarding configs" 
  ON email_forwarding_configs 
  FOR DELETE 
  USING (user_id = auth.uid());
```

### Column Descriptions

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | BIGINT | PK, AUTO | Unique identifier for the configuration |
| `user_id` | BIGINT | FK → users | The seller who owns this configuration |
| `name` | VARCHAR(255) | NOT NULL | Human-readable name (e.g., "Client Support Forwarder") |
| `description` | TEXT | NULL | Optional description of the config purpose |
| `email` | VARCHAR(255) | NOT NULL | Email address to monitor (Gmail, Outlook, Yahoo, etc.) |
| `password` | TEXT | NOT NULL | App-specific password for IMAP authentication |
| `forward_label` | VARCHAR(100) | DEFAULT 'forward' | Gmail label to search for (case-insensitive) |
| `recipient_emails` | TEXT[] | NOT NULL | Array of email addresses to forward to |
| `enabled` | BOOLEAN | DEFAULT TRUE | Whether the forwarding is active |
| `emails_checked` | BIGINT | DEFAULT 0 | Total emails scanned (counter) |
| `emails_forwarded` | BIGINT | DEFAULT 0 | Total emails forwarded (counter) |
| `last_check_at` | TIMESTAMP | NULL | Last time the inbox was checked |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Configuration creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last modification timestamp |

---

## Related Table: `email_forwarding_logs` (Optional - For audit trail)

### Purpose
Optional table to maintain an audit log of all forwarding actions. Useful for debugging and history tracking.

```sql
-- Create email_forwarding_logs table (OPTIONAL)
CREATE TABLE email_forwarding_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  config_id BIGINT NOT NULL REFERENCES email_forwarding_configs(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  email_from VARCHAR(255),
  email_subject VARCHAR(500),
  recipients_count INT,
  status VARCHAR(50), -- 'success', 'failed', 'skipped'
  error_message TEXT,
  forwarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_forwarding_logs_config_id 
  ON email_forwarding_logs(config_id);

CREATE INDEX idx_email_forwarding_logs_user_id 
  ON email_forwarding_logs(user_id);
```

---

## How the Feature Works

### 1. **Configuration Creation**
- Seller logs in and navigates to "Email Forwarding Bot"
- Fills in form with:
  - Email address to monitor
  - App-specific password
  - Gmail label to watch (e.g., "forward")
  - Recipient email addresses (comma-separated)
- Configuration is saved to `email_forwarding_configs` table

### 2. **Email Scanning (Automated Task)**
A backend scheduler (Node.js `node-schedule`) periodically:
- Queries all enabled configurations
- Connects to each email inbox via IMAP
- Searches for emails with the specified label
- Identifies unsent emails in that label

### 3. **Email Forwarding (Automated Task)**
For each email found:
- Reads the email content
- Creates a new email with original content
- Sets recipients to the configured recipient list
- Sends via the source email account (or dedicated service account)
- Logs the action to `email_forwarding_logs` (optional)
- Marks email as processed (removes label or archives)

### 4. **Status Tracking**
- `emails_checked`: Incremented each scan cycle
- `emails_forwarded`: Incremented on successful forward
- `last_check_at`: Updated after each scan

---

## Setup Instructions for Supabase Console

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project
3. Click on "SQL Editor" in the sidebar
4. Click "New Query"

### Step 2: Create Main Table
Copy and paste the main table creation SQL:

```sql
-- Create email_forwarding_configs table
CREATE TABLE email_forwarding_configs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  email VARCHAR(255) NOT NULL,
  password TEXT NOT NULL,
  forward_label VARCHAR(100) DEFAULT 'forward',
  recipient_emails TEXT[] NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  emails_checked BIGINT DEFAULT 0,
  emails_forwarded BIGINT DEFAULT 0,
  last_check_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_forwarding_configs_user_id 
  ON email_forwarding_configs(user_id);

CREATE INDEX idx_email_forwarding_configs_enabled_check 
  ON email_forwarding_configs(enabled, last_check_at);

ALTER TABLE email_forwarding_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email forwarding configs" 
  ON email_forwarding_configs 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own email forwarding configs" 
  ON email_forwarding_configs 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own email forwarding configs" 
  ON email_forwarding_configs 
  FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own email forwarding configs" 
  ON email_forwarding_configs 
  FOR DELETE 
  USING (user_id = auth.uid());
```

Click "Run" to execute.

### Step 3: (Optional) Create Logs Table
If you want to maintain audit logs, run:

```sql
CREATE TABLE email_forwarding_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  config_id BIGINT NOT NULL REFERENCES email_forwarding_configs(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  email_from VARCHAR(255),
  email_subject VARCHAR(500),
  recipients_count INT,
  status VARCHAR(50),
  error_message TEXT,
  forwarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_forwarding_logs_config_id 
  ON email_forwarding_logs(config_id);

CREATE INDEX idx_email_forwarding_logs_user_id 
  ON email_forwarding_logs(user_id);

ALTER TABLE email_forwarding_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own forwarding logs" 
  ON email_forwarding_logs 
  FOR SELECT 
  USING (user_id = auth.uid());
```

### Step 4: Verify Table Creation
In Supabase dashboard:
1. Go to "Table Editor"
2. You should see `email_forwarding_configs` and optionally `email_forwarding_logs`
3. Click on the table to verify columns

---

## Security Considerations

### ⚠️ Password Storage
**CRITICAL**: The `password` field stores email app-passwords in plaintext. In production:
1. **Encrypt passwords** using a library like `bcryptjs` or `crypto`
2. **Use environment variables** for encryption keys
3. **Consider a secrets manager** (AWS Secrets Manager, Vault, etc.)

Example encryption in Node.js:
```javascript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32-byte key

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
```

### Row Level Security (RLS)
- Users can only access their own configurations
- Prevents cross-user data leaks
- Policies enforce seller isolation

### IMAP Authentication
- Use app-specific passwords (Google, Microsoft), not account passwords
- Educate users on security best practices
- Implement rate limiting to prevent brute force

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bot/email-forwarding` | List all configurations |
| POST | `/api/bot/email-forwarding` | Create new configuration |
| PUT | `/api/bot/email-forwarding/{id}` | Update configuration |
| DELETE | `/api/bot/email-forwarding/{id}` | Delete configuration |
| POST | `/api/bot/email-forwarding/{id}/test` | Test email connection |

---

## Future Enhancements

1. **Scheduled Tasks**: Implement background job to scan emails periodically (every 5-15 minutes)
2. **IMAP Integration**: Use `imap` or `node-imap` library for inbox scanning
3. **Email Processing**: Use `mailparser` to parse email content
4. **Forwarding Logic**:
   - Support email filtering (from, subject, body keywords)
   - Template support for forwarded emails
   - Attachment handling
5. **Logging**: Store forwarding history in `email_forwarding_logs`
6. **Notifications**: Alert users on forwarding failures
7. **Analytics**: Dashboard showing forwarding stats

---

## Testing

### Manual Test Steps

1. Create a configuration:
```bash
curl -X POST http://localhost:5000/api/bot/email-forwarding \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Forwarder",
    "email": "test@gmail.com",
    "password": "app-password-here",
    "forward_label": "forward",
    "recipient_emails": ["recipient@example.com"],
    "enabled": true
  }'
```

2. List configurations:
```bash
curl -X GET http://localhost:5000/api/bot/email-forwarding \
  -H "Authorization: Bearer <token>"
```

3. Test connection:
```bash
curl -X POST http://localhost:5000/api/bot/email-forwarding/1/test \
  -H "Authorization: Bearer <token>"
```

---

## Troubleshooting

### "Table does not exist"
- Verify you ran the SQL creation script
- Check table exists in Supabase Table Editor
- Ensure you're using correct table name

### "RLS violation"
- User ID must match. Check JWT payload
- Verify RLS policies are correctly set up
- Check Row Level Security is enabled on table

### IMAP Connection Failure
- Gmail: Use app-specific password, not account password
- Outlook: Enable IMAP in account settings
- Yahoo: May require "Allow less secure apps" or app password
- Custom SMTP: Verify host, port, and credentials

---

## References

- [Supabase SQL Documentation](https://supabase.com/docs/reference/sql)
- [Gmail IMAP Setup](https://support.google.com/mail/answer/7126229)
- [Outlook IMAP Setup](https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-d088b986-291d-42b8-9564-9c414e2aa040)
- [Node IMAP Library](https://github.com/mscdex/node-imap)
- [Nodemailer Documentation](https://nodemailer.com/about/)
