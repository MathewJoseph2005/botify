-- Supabase Migration Script for Botify
-- Run this script in your Supabase SQL Editor to create the necessary tables
-- Or use via Supabase CLI: supabase db push

-- Enable Row Level Security by default
-- Note: You can adjust RLS policies based on your security requirements

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id BIGSERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (role_name, description) VALUES 
    ('admin', 'Platform administrator with full access'),
    ('seller', 'Bot seller who can list and manage bots'),
    ('buyer', 'User who can browse and purchase bots')
ON CONFLICT (role_name) DO NOTHING;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- Enable Row Level Security (RLS) on tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles table
-- Allow everyone to read roles (needed for signup/login)
CREATE POLICY "Allow read access to roles" ON roles
    FOR SELECT TO authenticated, anon
    USING (true);

-- RLS Policies for users table
-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT TO authenticated
    USING (auth.uid()::text = user_id::text);

-- Allow service role to bypass RLS (for backend operations)
-- The service role key used in backend will automatically bypass RLS

-- Note: For insert operations during signup, the backend uses the service role key
-- which bypasses RLS, so no explicit insert policy is needed here.

-- Optional: If you want to enable direct user registration through Supabase Auth
-- you would create additional policies here.

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
