# Supabase Setup Checklist - Email Forwarding Bot (Separate Account)

This is a quick reference for setting up a **SEPARATE Supabase account** specifically for the Email Forwarding Bot feature.

⚠️ **IMPORTANT**: Email Forwarding uses a **DIFFERENT Supabase project** from your main Botify account.
This separation:
- Prevents conflicts with existing features
- Allows independent scaling
- Improves security & data isolation
- Keeps core features unaffected if email forwarding has issues

---

## 🔑 Prerequisites

You will need **TWO separate Supabase accounts**:

### Account 1: Main Botify (Already Configured)
- Used for: Users, Roles, Bots, Marketplace, WhatsApp, Auth
- Environment variables: `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

### Account 2: Email Forwarding (NEW - This Checklist)
- Used exclusively for: Email Forwarding Bot
- Environment variables: `EMAIL_FORWARDING_SUPABASE_URL` and `EMAIL_FORWARDING_SUPABASE_SERVICE_KEY`

### Before you start
- Have your new Email Forwarding Supabase project URL ready
  - Get from: https://app.supabase.com → Select project → Settings → API Keys
  - Copy the **Project URL** (e.g., `https://your-email-forwarding-project.supabase.co`)
- Have the **service_role key** ready (labeled as full-access token)
  - ⚠️ Keep this secret! Never commit to version control
- Update `.env` file with these two new variables

---

## ✅ Step-by-Step Email Forwarding Supabase Setup

### STEP 1: Create Email Forwarding Config Table (in SEPARATE account)

**Location**: SQL Editor

1. Open https://app.supabase.com
2. Select your Botify project
3. Left sidebar → **SQL Editor**
4. Click **"New Query"**
5. Paste entire SQL below:

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

6. Click **"Run"** (blue button)
7. Wait for confirmation message ✅

---

### STEP 2: (OPTIONAL) Create Email Forwarding Logs Table

**Location**: SQL Editor

1. Click **"New Query"** again
2. Paste SQL below:

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

3. Click **"Run"**

---

### STEP 3: Verify Tables in Email Forwarding Account

**Location**: Table Editor (in your EMAIL FORWARDING Supabase project)

1. Make sure you're in the **EMAIL FORWARDING** Supabase project
2. Left sidebar → **Table Editor**
3. Should see `email_forwarding_configs` (and optionally `email_forwarding_logs`)
4. Click on `email_forwarding_configs` to expand
5. Verify columns exist:
   - ✅ id (BIGINT)
   - ✅ user_id (BIGINT)
   - ✅ name (VARCHAR)
   - ✅ description (TEXT)
   - ✅ email (VARCHAR)
   - ✅ password (TEXT)
   - ✅ forward_label (VARCHAR)
   - ✅ recipient_emails (TEXT[])
   - ✅ enabled (BOOLEAN)
   - ✅ emails_checked (BIGINT)
   - ✅ emails_forwarded (BIGINT)
   - ✅ last_check_at (TIMESTAMP)
   - ✅ created_at (TIMESTAMP)
   - ✅ updated_at (TIMESTAMP)

---

### STEP 4: Check RLS Policies in Email Forwarding Account

**Location**: Authentication → Policies (in your EMAIL FORWARDING Supabase project)

1. Left sidebar → **Authentication**
2. Click **"Policies"** tab
3. Find table: **email_forwarding_configs**
4. Verify 4 policies exist:
   - ✅ "Users can view their own email forwarding configs" (SELECT)
   - ✅ "Users can create their own email forwarding configs" (INSERT)
   - ✅ "Users can update their own email forwarding configs" (UPDATE)
   - ✅ "Users can delete their own email forwarding configs" (DELETE)

If missing, run STEP 1 again and copy RLS policy sections

---

### STEP 5: Check Indexes in Email Forwarding Account

**Location**: SQL Editor (in your EMAIL FORWARDING Supabase project)

1. Make sure you're in the **EMAIL FORWARDING** Supabase project
2. Paste SQL to verify indexes:

```sql
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes 
WHERE tablename = 'email_forwarding_configs';
```

3. Click **"Run"**
4. Should see results:
   - ✅ `idx_email_forwarding_configs_user_id`
   - ✅ `idx_email_forwarding_configs_enabled_check`

---

## ⚙️ Email Forwarding Supabase Credentials

### STEP 6: Get Email Forwarding Service Key

**Location**: Settings → API Keys (in your EMAIL FORWARDING Supabase project)

1. Open https://app.supabase.com
2. **Select your EMAIL FORWARDING project** (NOT your main Botify project)
3. Left sidebar → **Settings**
4. Click **"API Keys"**
5. Find row with "service_role key" → Copy it (starts with `eyJhbG...`)
6. Paste into backend `.env` file:
   ```env
   EMAIL_FORWARDING_SUPABASE_SERVICE_KEY=eyJhbG...
   ```

⚠️ **CRITICAL**: Do NOT use your main Botify service key here. Use the separate EMAIL FORWARDING account key.

### STEP 7: Get Email Forwarding Project URL

**Location**: Settings → General (in your EMAIL FORWARDING Supabase project)

1. In your EMAIL FORWARDING Supabase project
2. Left sidebar → **Settings**
3. Click **"General"**
4. Project URL should be visible (e.g., `https://your-email-forwarding-project.supabase.co`)
5. Paste into backend `.env` file:
   ```env
   EMAIL_FORWARDING_SUPABASE_URL=https://your-email-forwarding-project.supabase.co
   ```

### STEP 8: Verify .env File Has Both Accounts

Your `.env` file should now have BOTH sets of credentials:

```env
# Main Botify Account (existing)
SUPABASE_URL=https://your-main-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...main-account-key...

# Email Forwarding Account (NEW - separate)
EMAIL_FORWARDING_SUPABASE_URL=https://your-email-forwarding-project.supabase.co
EMAIL_FORWARDING_SUPABASE_SERVICE_KEY=eyJhbG...email-forwarding-account-key...
```

✅ Both are different Supabase projects
✅ Both have their own service keys
✅ No conflicts between accounts

---

## 🔐 Security Considerations in Supabase

### Password Field
⚠️ **CRITICAL**: The `password` field stores email app-passwords.
- Currently: **Stored as plaintext** (security risk)
- **TODO**: Encrypt using pgcrypto in Supabase or encryption middleware in Node.js

If you want to encrypt in Supabase, modify column:
```sql
-- Add pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Modify password column to store encrypted data
ALTER TABLE email_forwarding_configs
  DROP COLUMN password;

ALTER TABLE email_forwarding_configs
  ADD COLUMN password_encrypted BYTEA;

-- Create function to encrypt
CREATE OR REPLACE FUNCTION encrypt_password(plain_password TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(plain_password, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;

-- Create function to decrypt
CREATE OR REPLACE FUNCTION decrypt_password(encrypted_password BYTEA)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_password, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Testing Data (Optional)

To test the feature without a real email account, manually insert test data:

**Location**: SQL Editor

```sql
-- Insert test configuration
INSERT INTO email_forwarding_configs 
(user_id, name, description, email, password, forward_label, recipient_emails, enabled)
VALUES (
  1, 
  'Test Forwarder', 
  'Test configuration for email forwarding', 
  'test@gmail.com', 
  'app-password-here', 
  'forward', 
  ARRAY['recipient@example.com'], 
  TRUE
);
```

Then in Table Editor, you should see this row appear.

---

## 🚨 Troubleshooting Supabase Issues

### "Permission Denied" or "RLS violation"
**Cause**: RLS policies blocking access
**Fix**:
1. Verify policies are created (STEP 4)
2. Check that `user_id = auth.uid()` matches actual JWT
3. Temporarily disable RLS for testing:
   ```sql
   ALTER TABLE email_forwarding_configs DISABLE ROW LEVEL SECURITY;
   ```

### "Table does not exist"
**Cause**: SQL script didn't execute properly
**Fix**:
1. Go to SQL Editor
2. Run STEP 1 SQL again
3. Check for error messages in output

### "Foreign key constraint violation"
**Cause**: Inserting with invalid user_id
**Fix**:
1. Verify user exists in `users` table
2. Use valid user_id from auth

### Can't see table in Table Editor
**Cause**: Supabase cache or schema not refreshed
**Fix**:
1. Refresh page (F5)
2. Logout and login to Supabase console
3. Check in SQL Editor that table exists: `SELECT * FROM email_forwarding_configs LIMIT 1;`

---

## 📋 Verification Checklist

✅ **Email Forwarding Supabase Account (Separate)**
- [ ] Created separate Supabase project for email forwarding (NOT main Botify account)
- [ ] `email_forwarding_configs` table created with 14 columns
- [ ] `email_forwarding_logs` table created (optional)
- [ ] Indexes created on user_id and enabled/last_check_at
- [ ] RLS policies enabled and visible
- [ ] Service key copied to `.env` as `EMAIL_FORWARDING_SUPABASE_SERVICE_KEY`
- [ ] Project URL copied to `.env` as `EMAIL_FORWARDING_SUPABASE_URL`
- [ ] Test query in EMAIL FORWARDING account returns: `SELECT * FROM email_forwarding_configs LIMIT 1;`

✅ **Main Botify Supabase Account (Untouched)**
- [ ] Original `SUPABASE_URL` still in `.env` (unchanged)
- [ ] Original `SUPABASE_SERVICE_KEY` still in `.env` (unchanged)
- [ ] No conflicts – both accounts have separate database files and client instances

---

## 🔄 How the Separation Works

**Backend Database Clients**:
- `back-end/config/database.js` → Main Botify Supabase (users, bots, marketplace, etc.)
- `back-end/config/emailForwardingDatabase.js` → Email Forwarding Supabase (email configs only)

**API Routes**:
- Email forwarding routes import and use `emailForwardingSupabase`
- All other routes use main `supabase` client
- Automatic fallback if Email Forwarding credentials not configured

**Environment Variables**:
- Main: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- Email Forwarding: `EMAIL_FORWARDING_SUPABASE_URL`, `EMAIL_FORWARDING_SUPABASE_SERVICE_KEY`

---

## 📚 Useful Supabase SQL Queries

### View all configurations for a user
```sql
SELECT * FROM email_forwarding_configs 
WHERE user_id = 1;
```

### Count forwarded emails by config
```sql
SELECT 
  config_id, 
  COUNT(*) as total_forwarded
FROM email_forwarding_logs
WHERE status = 'success'
GROUP BY config_id;
```

### View recent forwarding logs
```sql
SELECT * FROM email_forwarding_logs
ORDER BY forwarded_at DESC
LIMIT 20;
```

### Delete all test data
```sql
DELETE FROM email_forwarding_configs 
WHERE name = 'Test Forwarder';
```

### Reset counters for a config
```sql
UPDATE email_forwarding_configs
SET emails_checked = 0, emails_forwarded = 0, last_check_at = NULL
WHERE id = 1;
```

---

## 🔗 Related Documentation

- [Supabase Email Forwarding Setup Guide](./SUPABASE_EMAIL_FORWARDING_SETUP.md)
- [Email Forwarding Implementation Guide](./EMAIL_FORWARDING_IMPLEMENTATION.md)
- [Botify Setup Guide](./SETUP_GUIDE.md)

---

## 📞 Support

If stuck:
1. Check the **troubleshooting** section above
2. Review [SUPABASE_EMAIL_FORWARDING_SETUP.md](./SUPABASE_EMAIL_FORWARDING_SETUP.md) for detailed schema info
3. Run test queries in SQL Editor to verify table existence
4. Check backend logs: `npm run dev` (should show connection successful)
