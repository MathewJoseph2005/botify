# Email Forwarding Bot - Feature Summary & Next Steps

## 🚨 IMPORTANT: Uses Separate Supabase Account

This feature uses a **COMPLETELY SEPARATE Supabase project** from your main Botify account.

**Key Points**:
- ✅ Create a brand new Supabase project (not in main Botify project)
- ✅ All email forwarding data stored in separate account
- ✅ Uses different environment variables: `EMAIL_FORWARDING_SUPABASE_URL` and `EMAIL_FORWARDING_SUPABASE_SERVICE_KEY`
- ✅ Backend automatically routes to correct database client
- ✅ **No conflicts** with existing features

---

## Current Status

The **Email Forwarding Bot** feature is currently **70% complete**:

### ✅ Completed (Frontend & API Routes)

1. **Frontend UI** (`src/pages/EmailForwarding.jsx`)
   - Complete CRUD interface with card grid layout
   - Modal form for creating/editing configurations
   - Real-time error handling and success messages
   - Statistics display (emails_checked, emails_forwarded)
   - Enable/disable toggle for each configuration
   - Delete confirmation before removal

2. **API Routes** (`back-end/routes/bot.js`)
   - GET `/api/bot/email-forwarding` - List user's configurations
   - POST `/api/bot/email-forwarding` - Create new configuration with validation
   - PUT `/api/bot/email-forwarding/:id` - Update configuration with ownership check
   - DELETE `/api/bot/email-forwarding/:id` - Delete configuration
   - POST `/api/bot/email-forwarding/:id/test` - Test SMTP connection

3. **Frontend Integration**
   - Route added to `App.jsx` with private route protection (sellers only)
   - Button added to `SellerDashboard.jsx` quick actions
   - API client endpoints in `src/utils/api.js`

4. **Error Handling**
   - Graceful database errors if table doesn't exist yet
   - Ownership verification on all protected endpoints
   - Form validation before submission
   - User-friendly error messages

### ⏳ For Completion (Backend Services & Database)

This checklist covers what still needs to be done in order:

---

## 📋 Step-by-Step Completion Checklist

### Phase 1: Database Setup ⏰ **~15 minutes**

**What**: Create a NEW separate Supabase project and set up the `email_forwarding_configs` table

**How**:
1. Create a **new Supabase project** (separate from main Botify project)
   - Go to https://app.supabase.com → New Project
   - Choose organization and region
2. Follow [SUPABASE_SETUP_CHECKLIST.md](./SUPABASE_SETUP_CHECKLIST.md)
   - Open SQL Editor in **NEW EMAIL FORWARDING** project
   - Execute STEP 1 SQL (main table)
   - Execute STEP 2 SQL (optional logs table)
   - Verify in Table Editor
3. Get credentials from NEW project:
   - Copy Project URL → Add to `.env` as `EMAIL_FORWARDING_SUPABASE_URL`
   - Copy service_role key → Add to `.env` as `EMAIL_FORWARDING_SUPABASE_SERVICE_KEY`

**Files Used**:
- `back-end/config/email-forwarding-migration.sql`
- `back-end/config/emailForwardingDatabase.js` (new separate database client)
- `SUPABASE_SETUP_CHECKLIST.md`

**Verification**:
```bash
# In backend terminal
curl -X GET http://localhost:5000/api/bot/email-forwarding \
  -H "Authorization: Bearer <your-token>"

# Should return: {"success": true, "configs": []}
# If email forwarding Supabase not configured, returns 503 error (feature disabled)
```

---

### Phase 2: Backend Dependencies ⏰ **~5 minutes**

**What**: Install required npm packages for email handling

**How**:
```bash
cd back-end
npm install imap node-schedule mailparser
```

**Packages**:
- `imap`: Read emails from IMAP servers (Gmail, Outlook, Yahoo, etc.)
- `node-schedule`: Cron-like scheduler to check emails automatically
- `mailparser`: Parse email headers and body content

**Verification**:
```bash
npm list imap node-schedule mailparser
# Should show all three packages installed
```

---

### Phase 3: Email Forwarding Service ⏰ **~30 minutes**

**What**: Create automated background job to scan emails and forward them

**How**:

1. **Create new service file**: `back-end/services/EmailForwardingService.js`
   - Copy entire code from [EMAIL_FORWARDING_IMPLEMENTATION.md](./EMAIL_FORWARDING_IMPLEMENTATION.md) (Phase 2: Step 2)
   - This implements:
     - Email scanning every 5 minutes
     - IMAP connection to fetch emails with specified labels
     - Automatic forwarding to recipient list
     - Statistics tracking (emails_checked, emails_forwarded)
     - Error logging and graceful failure handling

2. **Integrate into server startup**: Edit `back-end/server.js`
   - Add import: `import EmailForwardingService from './services/EmailForwardingService.js';`
   - Add startup: `EmailForwardingService.start();` (before server listen)
   - Add graceful shutdown handling

3. **Add environment variables** to `.env`:
   ```env
   EMAIL_FORWARDING_CHECK_INTERVAL=5  # Minutes between scans
   # Optional: ENCRYPTION_KEY for password encryption
   ```

**Verification**:
```bash
npm run dev  # In back-end directory

# In logs you should see:
# [EmailForwarding] Service started - scanning every 5 minutes
# [EmailForwarding] Starting scan of X configurations
```

---

### Phase 4: Security Hardening ⏰ **~20 minutes**

**What**: Encrypt stored email passwords instead of storing plaintext

**How**:

Choose one approach:

**Option A: Client-side encryption (Node.js crypto)**
1. Edit `back-end/routes/bot.js`
2. Add encryption functions before routes:
   ```javascript
   import crypto from 'crypto';
   const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);
   ```
3. Encrypt password on POST: `encryptPassword(req.body.password)`
4. Decrypt password in service: `decryptPassword(config.password)`

**Option B: Database encryption (Supabase pgcrypto)**
1. Run SQL in Supabase editor (from [SUPABASE_EMAIL_FORWARDING_SETUP.md](./SUPABASE_EMAIL_FORWARDING_SETUP.md))
2. Uses PostgreSQL native encryption

**Recommendation**: Option A (easier to implement, same security)

**Verification**:
- Inspect database: passwords should be encrypted strings like `a1b2c3d4:xyz123abc`
- Not plaintext like `your-app-password`

---

### Phase 5: Testing & Validation ⏰ **~30 minutes**

**What**: Verify all components work end-to-end

**Test Cases**:

1. **API Tests**
   ```bash
   # 1. Create config
   curl -X POST http://localhost:5000/api/bot/email-forwarding \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "My Forwarder",
       "email": "myaccount@gmail.com",
       "password": "app-password",
       "forward_label": "forward",
       "recipient_emails": ["team@company.com"],
       "enabled": true
     }'
   
   # 2. Test connection
   curl -X POST http://localhost:5000/api/bot/email-forwarding/1/test \
     -H "Authorization: Bearer <token>"
   
   # 3. List configs
   curl -X GET http://localhost:5000/api/bot/email-forwarding \
     -H "Authorization: Bearer <token>"
   ```

2. **Frontend Tests**
   - Navigate to `/email-forwarding` page
   - Create new configuration
   - Edit existing configuration
   - Toggle enable/disable
   - Delete configuration
   - Verify Supabase updates reflect in UI

3. **End-to-End Test**
   - Set up real Gmail account with app password
   - Create configuration in UI
   - Add test email with "forward" label in Gmail
   - Wait 5 minutes (or trigger scan manually)
   - Check recipient email for forwarded message
   - Verify `emails_forwarded` counter incremented

---

## 📚 Complete Resource Guide

All documentation files created:

| File | Purpose | How to Use |
|------|---------|-----------|
| [SUPABASE_SETUP_CHECKLIST.md](./SUPABASE_SETUP_CHECKLIST.md) | Quick reference for Supabase setup | Follow STEP 1-7 in order |
| [SUPABASE_EMAIL_FORWARDING_SETUP.md](./SUPABASE_EMAIL_FORWARDING_SETUP.md) | Detailed schema documentation | Reference for table structure and security |
| [EMAIL_FORWARDING_IMPLEMENTATION.md](./EMAIL_FORWARDING_IMPLEMENTATION.md) | Complete implementation guide | Follow Phase 1-4 for code setup |
| [back-end/config/email-forwarding-migration.sql](./back-end/config/email-forwarding-migration.sql) | Database migration SQL | Run in Supabase SQL Editor |

---

## 🚀 Quick Start Command

To complete all phases in quickest possible way:

```bash
# PHASE 1: Database (in Supabase console)
# Open SQL Editor, run STEP 1 from SUPABASE_SETUP_CHECKLIST.md

# PHASE 2: Dependencies
cd back-end
npm install imap node-schedule mailparser

# PHASE 3: Service
# Copy EmailForwardingService.js from EMAIL_FORWARDING_IMPLEMENTATION.md Phase 2
# Integrate into server.js

# PHASE 4: Test
npm run dev
# Should see "[EmailForwarding] Service started - scanning every 5 minutes"

# PHASE 5: Verify UI
cd ../front-end
npm run dev
# Navigate to http://localhost:3001/email-forwarding
```

---

## 🔑 Important Notes

### Email Provider Requirements

Users need **app-specific passwords**, not account passwords:

- **Gmail**: 
  - Enable 2-factor authentication
  - Generate app password at https://myaccount.google.com/apppasswords
  
- **Outlook/Hotmail**:
  - Enable 2-factor (if not already)
  - Use app password from account settings
  
- **Yahoo**:
  - Enable 2-factor
  - Generate app password
  
- **Other providers**: Similar process, look for "app passwords" or "security" settings

### Scanning Frequency

Default: Every 5 minutes
- Modify in EmailForwardingService.js: `'*/5 * * * *'` → `'*/15 * * * *'` for 15 minutes
- Balance between responsiveness and server load

### Limitations & Future Enhancements

**Current**:
- Scans entire inbox for label (not incremental)
- Forwards to email as-is (no template support)
- Logs to optional table for audit trail

**Future enhancements**:
- Incremental scanning (only new emails since last check)
- Email templates with variable substitution
- Attachment handling and filtering
- Subject line modifications
- Scheduled/pause forwarding
- Rate limiting per recipient

---

## 🆘 Troubleshooting Guide

### Service not starting?
```
Error: Cannot find module 'imap'
→ Run: npm install imap node-schedule mailparser
```

### IMAP connection fails?
```
Error: Invalid login or insufficient security
→ Use app-specific password, not account password
→ Verify IMAP is enabled in email account settings
```

### Emails not forwarding?
```
Check:
1. Label name matches exactly (case-sensitive for Gmail)
2. Test emails manually created with label
3. Check logs: "Found 0 emails" vs "Found N emails"
4. Verify recipient email addresses are valid
```

### RLS policy errors?
```
Error: "new row violates row-level security policy"
→ Verify JWT user_id matches database user_id
→ Check RLS policies created (STEP 4 in SUPABASE_SETUP_CHECKLIST.md)
```

---

## ✨ Success Criteria

Feature is complete when:

- ✅ **Database**: `email_forwarding_configs` table exists in Supabase
- ✅ **UI**: Can create/edit/delete configurations in frontend
- ✅ **API**: All 5 endpoints return correct responses
- ✅ **Service**: Logs show scanner running every 5 minutes
- ✅ **Test**: Real email was forwarded successfully
- ✅ **Security**: Passwords encrypted in database
- ✅ **Documentation**: User guide created for sellers

---

## 📞 Need Help?

1. **Database issues?** → Read [SUPABASE_SETUP_CHECKLIST.md](./SUPABASE_SETUP_CHECKLIST.md)
2. **Implementation questions?** → Check [EMAIL_FORWARDING_IMPLEMENTATION.md](./EMAIL_FORWARDING_IMPLEMENTATION.md)
3. **Schema details?** → See [SUPABASE_EMAIL_FORWARDING_SETUP.md](./SUPABASE_EMAIL_FORWARDING_SETUP.md)
4. **Frontend/API working?** → Already done! ✅

---

## 📊 Effort Estimate

| Phase | Time | Priority |
|-------|------|----------|
| Phase 1: Database | 15 min | 🔴 Critical |
| Phase 2: Dependencies | 5 min | 🔴 Critical |
| Phase 3: Service | 30 min | 🔴 Critical |
| Phase 4: Security | 20 min | 🟡 High |
| Phase 5: Testing | 30 min | 🟢 Medium |
| **Total** | **~2 hours** | — |

**Minimum viable product (Phase 1-3)**: ~50 minutes

---

**Last Updated**: 2024-01-15
**Status**: Documentation Complete - Ready for Implementation
