import supabase from './database.js';

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema...');
    
    // Check if bot_scripts table exists
    const { data: botScriptsTable, error: botScriptsError } = await supabase
      .from('bot_scripts')
      .select('id')
      .limit(1);

    if (botScriptsError?.code === 'PGRST116') {
      // Table doesn't exist
      console.warn(`⚠️  Table 'bot_scripts' not found. Run this SQL in Supabase:`);
      console.warn(`    See: back-end/config/bot-creation-migration.sql`);
      console.warn(`📌 Platform-specific bot creation features will not work until migration is run.\n`);
      return false;
    }

    // Check if required columns exist in marketplace_bots
    const { data: marketplaceBots, error: marketplaceError } = await supabase
      .from('marketplace_bots')
      .select('bot_script, github_link, config_json')
      .limit(1);

    if (marketplaceError?.code === 'PGRST116') {
      // Handle the specific column error
      console.warn(`⚠️  Required columns missing from 'marketplace_bots' table.`);
      console.warn(`    Run this SQL in Supabase SQL Editor:`);
      console.warn(`    ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS bot_script TEXT;`);
      console.warn(`    ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS github_link VARCHAR(255);`);
      console.warn(`    ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}'::jsonb;\n`);
      return false;
    }

    console.log('✅ Database schema verified');
    return true;
  } catch (err) {
    console.warn('⚠️  Could not verify database schema:', err.message);
    return false;
  }
}

export default checkDatabaseSchema;
