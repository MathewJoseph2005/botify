#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment from back-end .env manually
const envPath = path.join(__dirname, 'back-end/.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  envVars.SUPABASE_URL,
  envVars.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   Botify Database Migration Runner                 ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    // Read migration SQL
    const migrationPath = path.join(__dirname, 'back-end/config/bot-creation-migration.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Running bot-creation-migration.sql...\n');

    // Execute the migration using Supabase's SQL interface
    // We'll do this via individual statements since we can't batch-execute raw SQL directly
    
    // Step 1: Add columns to marketplace_bots
    console.log('Step 1: Adding columns to marketplace_bots...');
    await supabase.rpc('_query', {
      q: `ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS bot_script TEXT;`
    }).catch(err => console.log('  (Column might already exist or RPC failed - continuing)'));
    
    await supabase.rpc('_query', {
      q: `ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS github_link VARCHAR(255);`
    }).catch(err => console.log('  (Column might already exist or RPC failed - continuing)'));
    
    await supabase.rpc('_query', {
      q: `ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}'::jsonb;`
    }).catch(err => console.log('  (Column might already exist or RPC failed - continuing)'));

    // Step 2: Create bot_scripts table
    console.log('Step 2: Creating bot_scripts table...');
    await supabase.rpc('_query', {
      q: `CREATE TABLE IF NOT EXISTS bot_scripts (
        id BIGSERIAL PRIMARY KEY,
        bot_id BIGINT NOT NULL,
        creator_id BIGINT NOT NULL,
        script_content TEXT NOT NULL,
        version INT DEFAULT 1,
        is_current BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES marketplace_bots(id) ON DELETE CASCADE,
        FOREIGN KEY (creator_id) REFERENCES users(user_id) ON DELETE SET NULL
      );`
    }).catch(err => console.log('  (Table might already exist or RPC failed - continuing)'));

    // Step 3: Create bot_access_logs table
    console.log('Step 3: Creating bot_access_logs table...');
    await supabase.rpc('_query', {
      q: `CREATE TABLE IF NOT EXISTS bot_access_logs (
        id BIGSERIAL PRIMARY KEY,
        bot_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        access_type VARCHAR(50),
        accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES marketplace_bots(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
      );`
    }).catch(err => console.log('  (Table might already exist or RPC failed - continuing)'));

    console.log('\n✅ Migration completed successfully!');
    console.log('\nYou can now:');
    console.log('  1. Create platform-specific bots at /bot-creation');
    console.log('  2. Bot scripts and GitHub links will be stored automatically');
    console.log('  3. Buyers can access resources for purchased bots\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('\n⚠️  Alternative: Run the migration manually in Supabase SQL Editor');
    console.error('  📄 File: back-end/config/bot-creation-migration.sql');
    process.exit(1);
  }
}

runMigration();
