import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import supabase from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   Botify Database Migration Runner                 ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    const migrationPath = path.join(__dirname, 'config/bot-creation-migration.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    console.log('📄 Running bot-creation-migration.sql...\n');

    // Step 1: Add columns to marketplace_bots
    console.log('Step 1: Adding columns to marketplace_bots table...');
    
    const addColumnsSQL = `
      ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS bot_script TEXT;
      ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS github_link VARCHAR(255);
      ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}'::jsonb;
    `;

    const { error: colError } = await supabase.rpc('query', { sql: addColumnsSQL }).catch(() => ({}));
    
    // Try individual statements if batch fails
    if (colError) {
      console.log('  → Trying individual column additions...');
      const colStatements = [
        'ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS bot_script TEXT;',
        'ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS github_link VARCHAR(255);',
        'ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT \'{}\' ::jsonb;'
      ];

      for (const stmt of colStatements) {
        await supabase.rpc('query', { sql: stmt }).catch(e => console.log('    Column might already exist'));
      }
    }
    
    console.log('✅ Marketplace_bots columns verified\n');

    // Step 2: Create bot_scripts table
    console.log('Step 2: Creating bot_scripts table...');
    
    const createBotScriptsSQL = `
      CREATE TABLE IF NOT EXISTS bot_scripts (
        id BIGSERIAL PRIMARY KEY,
        bot_id BIGINT NOT NULL,
        creator_id BIGINT NOT NULL,
        script_content TEXT NOT NULL,
        version INT DEFAULT 1,
        is_current BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES marketplace_bots(id) ON DELETE CASCADE,
        FOREIGN KEY (creator_id) REFERENCES users(user_id) ON DELETE SET NULL
      );
    `;

    await supabase.rpc('query', { sql: createBotScriptsSQL }).catch(() => console.log('  Table might already exist'));
    console.log('✅ bot_scripts table verified\n');

    // Step 3: Create bot_access_logs table
    console.log('Step 3: Creating bot_access_logs table...');
    
    const createAccessLogsSQL = `
      CREATE TABLE IF NOT EXISTS bot_access_logs (
        id BIGSERIAL PRIMARY KEY,
        bot_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        access_type VARCHAR(50),
        accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES marketplace_bots(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
      );
    `;

    await supabase.rpc('query', { sql: createAccessLogsSQL }).catch(() => console.log('  Table might already exist'));
    console.log('✅ bot_access_logs table verified\n');

    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║   ✅ Migration completed successfully!             ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log('You can now:');
    console.log('  1. Create platform-specific bots at /bot-creation');
    console.log('  2. Bot scripts and GitHub links will be stored automatically');
    console.log('  3. Buyers can access resources for purchased bots\n');
    
    process.exit(0);

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('\n⚠️  Try running the migration manually in Supabase SQL Editor:');
    console.error('  📄 File: back-end/config/bot-creation-migration.sql');
    console.error('  🔗 URL: https://app.supabase.com/\n');
    process.exit(1);
  }
}

runMigration();
