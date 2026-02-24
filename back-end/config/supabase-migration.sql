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
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT
);

-- Add is_banned column if table already exists (idempotent migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- Create bots table for email bot configurations
CREATE TABLE IF NOT EXISTS bots (
    bot_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    bot_name VARCHAR(100) NOT NULL,
    bot_email VARCHAR(255) NOT NULL,
    bot_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create marketplace_bots table for bots listed on the marketplace
CREATE TABLE IF NOT EXISTS marketplace_bots (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    platform VARCHAR(50) NOT NULL, -- 'email', 'whatsapp', 'telegram', 'discord', 'slack', 'instagram'
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    features TEXT[], -- array of feature strings
    category VARCHAR(100),
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    total_sales INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create purchases table for tracking bot purchases
CREATE TABLE IF NOT EXISTS purchases (
    id BIGSERIAL PRIMARY KEY,
    buyer_id BIGINT NOT NULL,
    marketplace_bot_id BIGINT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'refunded'
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (marketplace_bot_id) REFERENCES marketplace_bots(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_active ON bots(is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_bots_seller ON marketplace_bots(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_bots_platform ON marketplace_bots(platform);
CREATE INDEX IF NOT EXISTS idx_marketplace_bots_status ON marketplace_bots(status);
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_bot ON purchases(marketplace_bot_id);

-- Enable Row Level Security (RLS) on tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

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
