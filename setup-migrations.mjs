#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`
╔════════════════════════════════════════════════════╗
║   Botify Database Migration Setup                  ║
╚════════════════════════════════════════════════════╝

This script helps you set up the database migrations for Botify.

STEP 1: Read the Migration SQL
─────────────────────────────────────────────────────

The migration SQL file is located at:
  📄 back-end/config/bot-creation-migration.sql

STEP 2: Run in Supabase
─────────────────────────────────────────────────────

1. Go to: https://app.supabase.com/project/[YOUR_PROJECT]/sql/new
2. Click "New Query"
3. Copy and paste the contents of bot-creation-migration.sql
4. Click "Run"

STEP 3: Verify
─────────────────────────────────────────────────────

Restart your backend server. If successful, you should see:
  ✅ Database schema verified

Your bot creation system is now ready!

`);

// Try to read and display the migration file
const migrationPath = path.join(__dirname, '../back-end/config/bot-creation-migration.sql');

if (fs.existsSync(migrationPath)) {
  console.log(`\n📋 Migration SQL Preview (first 50 lines):\n`);
  console.log('─ '.repeat(40));
  
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  const lines = sql.split('\n').slice(0, 50);
  console.log(lines.join('\n'));
  console.log('\n─ '.repeat(40));
  console.log(`\n... (see full file at bot-creation-migration.sql)\n`);
} else {
  console.log(`⚠️  Migration file not found at ${migrationPath}\n`);
}

console.log(`
📞 Support
─────────────────────────────────────────────────────
If you encounter any issues:
1. Check Supabase dashboard for any SQL errors
2. Verify your connection credentials in .env
3. Ensure you have SELECT, INSERT, CREATE permissions

Happy coding! 🚀
`);
