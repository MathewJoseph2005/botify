# Supabase Setup Guide for Botify

This guide will help you set up Supabase for the Botify backend.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in the project details:
   - **Name**: Botify (or your preferred name)
   - **Database Password**: Create a strong password (save it securely)
   - **Region**: Choose the closest region to your users
4. Click "Create new project" and wait for it to initialize

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click on the **Settings** icon (gear icon) in the left sidebar
2. Navigate to **API** section
3. You'll find two important credentials:
   - **Project URL**: Something like `https://xxxxxxxxxxxxx.supabase.co`
   - **Service Role Key (secret)**: A long JWT token starting with `eyJ...`
     - ⚠️ **Important**: Use the `service_role` key for the backend, NOT the `anon` key
     - The service role key bypasses Row Level Security and should be kept SECRET

## Step 3: Set Up Environment Variables

1. In the `back-end` folder, create a `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your Supabase credentials:
   ```env
   PORT=5000
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   NODE_ENV=development
   ```

## Step 4: Run the Database Migration

1. In your Supabase dashboard, navigate to the **SQL Editor** (database icon in left sidebar)
2. Create a new query
3. Copy the entire contents of `back-end/config/supabase-migration.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute the migration
6. Verify that the tables were created:
   - Go to **Table Editor** in the left sidebar
   - You should see `roles` and `users` tables

## Step 5: Verify Setup

You can verify your setup by checking:

1. **Tables Created**: In Supabase dashboard → Table Editor, you should see:
   - `roles` table with 3 rows (admin, seller, buyer)
   - `users` table (empty initially)

2. **Indexes Created**: In SQL Editor, run:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename IN ('users', 'roles');
   ```

3. **Row Level Security (RLS)**: Check that RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('users', 'roles');
   ```

## Step 6: Start the Backend Server

```bash
cd back-end
npm install
npm run dev
```

The server should start successfully and show:
```
✅ Connected to Supabase database
🚀 Botify Backend Server is running on port 5000
```

## Testing the API

Test the signup endpoint:
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "buyer"
  }'
```

## Additional Supabase Features

### Viewing Data
- Use the **Table Editor** in Supabase dashboard to view and edit data
- Use the **SQL Editor** for custom queries

### Monitoring
- **Database** → **Usage**: View database metrics
- **Logs**: View real-time logs of database queries

### Security
- **Row Level Security (RLS)**: Already enabled for `users` and `roles` tables
- **Service Role Key**: Keep this secret! Never expose it in client-side code
- The backend uses the service role key which bypasses RLS for administrative operations

### Backups
- Supabase automatically backs up your database
- View backups in **Database** → **Backups**

## Troubleshooting

### Connection Issues
- Verify your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
- Check that your Supabase project is active (not paused)

### Authentication Errors
- Ensure you're using the `service_role` key, not the `anon` key
- Verify the JWT_SECRET is set in your `.env` file

### Migration Errors
- If tables already exist, they won't be recreated (script uses `IF NOT EXISTS`)
- Check the SQL Editor output for any error messages
- Ensure you have the necessary permissions in your Supabase project

## Migration from PostgreSQL

If you previously had a local PostgreSQL database:

1. The old `pg` package is no longer needed (can be uninstalled)
2. Old PostgreSQL connection variables (`DB_HOST`, `DB_PORT`, etc.) are replaced with Supabase credentials
3. Your data needs to be migrated manually if you had existing records
4. The table structure remains the same, so data should be compatible

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
