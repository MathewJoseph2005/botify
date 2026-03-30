#!/usr/bin/env node

/**
 * Migration Setup Script for Botify
 * 
 * This script guides you through applying database migrations to Supabase.
 * Since Supabase doesn't allow direct SQL execution via the client library,
 * follow the manual steps provided by this script.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function showMigrationInstructions() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 BOTIFY DATABASE MIGRATION SETUP                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const migrationFile = path.join(__dirname, 'config', 'bot-creation-migration.sql');

  if (!fs.existsSync(migrationFile)) {
    console.error('❌ Error: Migration file not found at', migrationFile);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationFile, 'utf-8');

  console.log('📋 STEP-BY-STEP INSTRUCTIONS:\n');
  console.log('1️⃣  Go to your Supabase Dashboard:');
  console.log('   → https://supabase.com/dashboard/projects\n');

  console.log('2️⃣  Select your Botify project\n');

  console.log('3️⃣  Click "SQL Editor" in the left sidebar\n');

  console.log('4️⃣  Click "New Query"\n');

  console.log('5️⃣  Copy & paste the SQL below:\n');
  console.log('────────────────────────────────────────────────────────────');
  console.log(sqlContent);
  console.log('────────────────────────────────────────────────────────────\n');

  console.log('6️⃣  Click "RUN" button\n');

  console.log('7️⃣  If successful, you should see:');
  console.log('   ✅ "Query executed successfully"\n');

  console.log('8️⃣  After running the migration, restart your backend:');
  console.log('   → Press Ctrl+C to stop the backend');
  console.log('   → Run: npm run dev\n');

  console.log('9️⃣  Try creating a bot again - it should work now!\n');

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('❓ NEED HELP?\n');
  console.log('If you see any errors when running the SQL:');
  console.log('• "relation ... already exists" → Safe to ignore');
  console.log('• "column ... already exists" → Safe to ignore');
  console.log('• Other errors → Check your Supabase credentials\n');

  console.log('📚 SQL File Location:');
  console.log(`   ${migrationFile}\n`);
}

showMigrationInstructions();
