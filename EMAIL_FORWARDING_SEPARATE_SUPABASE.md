# Email Forwarding Bot - Separate Supabase Configuration Guide

## Overview

The Email Forwarding Bot feature uses a **completely separate Supabase project** from your main Botify application.

**Why separate accounts?**
- Prevents conflicts with core features
- Independent scaling and performance
- Better security and data isolation
- Easier to manage, backup, and monitor separately
- Complete disaster recovery isolation

---

## Architecture

### Database Clients

The backend has **TWO independent Supabase database clients**:

**1. Main Botify Database** (`back-end/config/database.js`)
- Contains: Users, Roles, Bots, Marketplace, Campaigns, etc.
- Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- Used by: All core features, authentication, marketplace

**2. Email Forwarding Database** (`back-end/config/emailForwardingDatabase.js`)
- Contains: Email forwarding configurations only
- Environment: `EMAIL_FORWARDING_SUPABASE_URL`, `EMAIL_FORWARDING_SUPABASE_SERVICE_KEY`
- Used by: Email forwarding API routes ONLY

### API Routes Routing

```
User Request
    ↓
/api/bot/email-forwarding/* ?
    ├─ YES → emailForwardingSupabase (SEPARATE account)
    └─ NO → supabase (MAIN account)
```

### Automatic Fallback

If `EMAIL_FORWARDING_SUPABASE_URL` or `EMAIL_FORWARDING_SUPABASE_SERVICE_KEY` are not configured:
- Email forwarding feature is **disabled** (graceful degradation)
- Returns 503 error with message: "Email Forwarding feature is not configured"
- All other features continue working normally

---

## Setup Steps

### Step 1: Create Separate Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Select your organization
4. Choose deployment region (typically same as main project)
5. **Name it something clear**: "Botify Email Forwarding" or similar
6. Create the project and wait for initialization

### Step 2: Get Credentials from NEW Project

1. In your **NEW Email Forwarding** Supabase project
2. Left sidebar → **Settings** → **API Keys**
3. Copy **Project URL**: `https://your-email-forwarding-project.supabase.co`
4. Copy **service_role key**: `eyJhbG...` (full access token)
5. Keep these values secure

### Step 3: Update .env File

```env
# ─────────────────────────────────────────────────────────────────────────
# Main Botify Account (existing - DO NOT change)
# ─────────────────────────────────────────────────────────────────────────
SUPABASE_URL=https://your-main-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...main-account-key...

# ─────────────────────────────────────────────────────────────────────────
# Email Forwarding Account (NEW - separate from above)
# ─────────────────────────────────────────────────────────────────────────
EMAIL_FORWARDING_SUPABASE_URL=https://your-email-forwarding-project.supabase.co
EMAIL_FORWARDING_SUPABASE_SERVICE_KEY=eyJhbG...email-forwarding-key...
```

### Step 4: Create Tables in Email Forwarding Account

In your **NEW Email Forwarding** Supabase project's SQL Editor:

```sql
-- Run this query
CREATE TABLE email_forwarding_configs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL,
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
```

### Step 5: Verify Configuration

```bash
cd back-end
npm run dev
```

Check logs for:
```
✅ Connected to Supabase database          (main account)
✅ Connected to Email Forwarding Supabase   (separate account)
```

Or if email forwarding is not configured:
```
✅ Connected to Supabase database
⚠️  Email Forwarding Supabase credentials not configured
   Email forwarding feature will not work until configured
```

---

## Environment Variables Reference

| Variable | Source | Usage | Required |
|----------|--------|-------|----------|
| `SUPABASE_URL` | Main project → Settings → API | Connect to main Botify database | ✅ Yes |
| `SUPABASE_SERVICE_KEY` | Main project → Settings → API | Authenticate with main database | ✅ Yes |
| `EMAIL_FORWARDING_SUPABASE_URL` | Email Forwarding project → Settings → API | Connect to email forwarding database | ⏳ Optional |
| `EMAIL_FORWARDING_SUPABASE_SERVICE_KEY` | Email Forwarding project → Settings → API | Authenticate with email forwarding database | ⏳ Optional |

---

## Code Changes for Separation

### Backend: New Database Client

**File**: `back-end/config/emailForwardingDatabase.js` (NEW)

Imports: `EMAIL_FORWARDING_SUPABASE_URL`, `EMAIL_FORWARDING_SUPABASE_SERVICE_KEY`
Exports: `emailForwardingSupabase` client instance

**Handles missing config**: Returns `null` if credentials not provided

### Backend: Updated Routes

**File**: `back-end/routes/bot.js`

Changes:
- Import: `emailForwardingSupabase from '../config/emailForwardingDatabase.js'`
- New middleware: `checkEmailForwardingSupabase` - validates client is configured
- All email forwarding routes use: `await emailForwardingSupabase.from(...)`
- Error handling: Returns 503 if email forwarding not configured

### Frontend: No Changes Required

Frontend uses same API endpoints (`/api/bot/email-forwarding/*`)
Backend automatically routes to correct database

---

## Troubleshooting

### Error: "Email Forwarding feature is not configured"

**Cause**: Environment variables not set or invalid
**Fix**:
1. Verify both variables in `.env`:
   ```bash
   echo $EMAIL_FORWARDING_SUPABASE_URL
   echo $EMAIL_FORWARDING_SUPABASE_SERVICE_KEY
   ```
2. Check logs on server startup: should show connection status
3. Verify values are from SEPARATE Supabase project, not main account

### Error: "Configuration not found"

**Cause**: User ID mismatch between main account (auth) and email forwarding account (storage)
**Fix**:
- Both accounts use the same `user_id` from main Botify database
- This is expected - email forwarding stores user_id but doesn't reference users table

### Slow Queries or Performance Issues

**Solution**: Email forwarding account can be scaled independently
- Increase compute resources in Email Forwarding Supabase project
- Does not affect main Botify performance
- Use analytical tools to monitor separately

---

## Security Best Practices

1. **Service Keys**: Keep both service keys secret, never commit to git
2. **Separate Projects**: Use completely separate Supabase projects (different organizations possible)
3. **Backup Strategy**: Email forwarding database has independent backups
4. **Password Storage**: Consider encrypting email app-passwords in transit and storage
5. **Monitoring**: Monitor both accounts separately for security events

---

## File Structure

```
back-end/
├── config/
│   ├── database.js                      ← Main Botify Supabase
│   ├── emailForwardingDatabase.js       ← Email Forwarding Supabase (NEW)
│   └── email-forwarding-migration.sql   ← Schema for email forwarding account
├── routes/
│   └── bot.js                           ← Uses both clients
├── services/
│   └── EmailForwardingService.js        ← Uses emailForwardingSupabase
└── .env                                 ← Both sets of credentials
```

---

## Disabling Email Forwarding

To disable email forwarding without removing code:

1. Remove from `.env`:
   ```bash
   unset EMAIL_FORWARDING_SUPABASE_URL
   unset EMAIL_FORWARDING_SUPABASE_SERVICE_KEY
   ```

2. Restart backend server

3. Email forwarding feature automatically disabled:
   - API returns 503 error
   - Frontend shows error message
   - All other features continue working

---

## Related Documentation

- [SUPABASE_SETUP_CHECKLIST.md](./SUPABASE_SETUP_CHECKLIST.md) - Step-by-step setup
- [EMAIL_FORWARDING_IMPLEMENTATION.md](./EMAIL_FORWARDING_IMPLEMENTATION.md) - Full implementation details
- [SUPABASE_EMAIL_FORWARDING_SETUP.md](./SUPABASE_EMAIL_FORWARDING_SETUP.md) - Database schema
- [.env.example](./back-end/.env.example) - Environment variable template

---

**Last Updated**: 2024-01-15
**Status**: Documented - Ready for Implementation
