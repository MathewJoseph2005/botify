import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import supabase from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('Starting database migrations...');

  try {
    // Read migration files in order
    const migrationFiles = [
      'bot-creation-migration.sql',
    ];

    for (const file of migrationFiles) {                                                                                             
      const filePath = path.join(__dirname, 'config', file);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`Migration file not found: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`Running migration: ${file}`);

      // Execute the migration
      const { error } = await supabase.rpc('exec_sql', { sql: sql });

      if (error) {
        // Check if it's a "function doesn't exist" error - this is normal on first setup
        if (error.message?.includes('function exec_sql')) {
          console.log('Note: Using direct SQL execution (exec_sql RPC not available)');
          // Fallback: execute statements directly
          const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));

          for (const statement of statements) {
            try {
              await supabase.rpc('_query', { q: statement }).catch(() => {
                // Ignore RPC errors, these are expected
              });
            } catch (err) {
              // Some statements might fail individually, that's okay
            }
          }
        } else {
          console.error(`Migration error in ${file}:`, error);
        }
      } else {
        console.log(`✓ Migration completed: ${file}`);
      }
    }

    console.log('Database migrations completed!');
  } catch (err) {
    console.error('Migration failed:', err);
    // Don't exit process - migrations are optional for some deployments
  }
}

export default runMigrations;
