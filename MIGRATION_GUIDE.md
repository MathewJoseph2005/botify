# 🚀 Bot Creation Migration Guide

The platform-specific bot creation feature requires some database schema updates.

## Quick Start

### Option 1: Automatic Migration (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com/
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the contents of `back-end/config/bot-creation-migration.sql`
6. Click "Run"
7. Restart your backend server

### Option 2: Manual Migration

If you prefer to review the changes first, the migration SQL is in:
📄 `back-end/config/bot-creation-migration.sql`

This file will:
- Add `bot_script`, `github_link`, and `config_json` columns to `marketplace_bots`
- Create `bot_scripts` table for script versioning
- Create `bot_access_logs` table for audit trail
- Create `bot_configurations` table for future extensibility
- Create indexes for optimal performance
- Insert platform configuration templates

## Verification

After running the migration, you should see in the backend console:
```
✅ Database schema verified
```

If you see missing column warnings, copy-paste the suggested SQL into Supabase SQL Editor.

## What's New

Once migrated, you can:

1. **Create Platform-Specific Bots**: Go to `/bot-creation` and select from 6 platforms
2. **Store Bot Scripts**: Each bot can include executable code
3. **Add GitHub Links**: Link to bot repositories (buyer-only access)
4. **Platform Configs**: Store platform-specific settings (SMTP, tokens, webhooks, etc)
5. **Access Control**: Buyers can view scripts and GitHub links only after purchase

## Troubleshooting

**"Failed to create listing" error?**
→ Run the migration SQL from this guide

**"Failed to load resource"?**
→ Make sure backend is running on port 5000

**Missing columns?**
→ Copy the ALTER TABLE statements into Supabase SQL Editor

## Support

All SQL statements are idempotent (safe to run multiple times).
Check Supabase dashboard → SQL Editor for any errors.
