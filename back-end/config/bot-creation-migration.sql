-- Migration: Bot Creation Configuration Tables
-- Adds support for platform-specific bot configurations, scripts, and GitHub links

-- Add columns to marketplace_bots for script/github storage
ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS bot_script TEXT; -- Raw script code
ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS github_link VARCHAR(255); -- GitHub repository link
ALTER TABLE marketplace_bots ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}'::jsonb; -- Platform-specific config

-- Create platform_configs table for storing platform-specific templates and requirements
CREATE TABLE IF NOT EXISTS platform_configs (
    id BIGSERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL UNIQUE, -- 'email', 'whatsapp', 'telegram', 'discord', 'slack', 'instagram'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    required_fields TEXT[], -- array of field names required for this platform
    optional_fields TEXT[], -- array of optional field names
    sample_config JSONB DEFAULT '{}'::jsonb, -- sample/template config
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create bot_configurations table for user-specific platform configs
CREATE TABLE IF NOT EXISTS bot_configurations (
    id BIGSERIAL PRIMARY KEY,
    marketplace_bot_id BIGINT NOT NULL UNIQUE,
    platform VARCHAR(50) NOT NULL,
    config_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- API keys, tokens, webhooks, etc (encrypted in production)
    setup_status VARCHAR(50) DEFAULT 'incomplete', -- 'incomplete', 'configured', 'testing', 'active'
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marketplace_bot_id) REFERENCES marketplace_bots(id) ON DELETE CASCADE
);

-- Create bot_scripts table for version control of scripts
CREATE TABLE IF NOT EXISTS bot_scripts (
    id BIGSERIAL PRIMARY KEY,
    bot_id BIGINT NOT NULL,
    creator_id BIGINT NOT NULL, -- seller_id
    script_content TEXT NOT NULL,
    version INT DEFAULT 1,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES marketplace_bots(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Create bot_access_logs for tracking who accessed bot scripts
CREATE TABLE IF NOT EXISTS bot_access_logs (
    id BIGSERIAL PRIMARY KEY,
    bot_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL, -- buyer_id
    access_type VARCHAR(50), -- 'script_access', 'github_access'
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES marketplace_bots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Insert platform configurations
INSERT INTO platform_configs (platform, name, description, icon, required_fields, optional_fields)
VALUES 
    ('email', 'Email Bot', 'Automated email sender and responder', '📧', ARRAY['smtp_host', 'smtp_port', 'email_address'], ARRAY['template_html', 'reply_rules']),
    ('whatsapp', 'WhatsApp Bot', 'WhatsApp automation and messaging', '💬', ARRAY['phone_number', 'account_sid'], ARRAY['webhook_url', 'message_templates']),
    ('telegram', 'Telegram Bot', 'Telegram bot with commands and handlers', '✈️', ARRAY['bot_token', 'bot_username'], ARRAY['webhook_url', 'commands_json']),
    ('discord', 'Discord Bot', 'Discord server automation and moderation', '🎮', ARRAY['bot_token', 'guild_id'], ARRAY['intents', 'prefix', 'commands_json']),
    ('slack', 'Slack Bot', 'Slack workspace automation', '💼', ARRAY['bot_token', 'workspace_id'], ARRAY['signing_secret', 'event_subscriptions']),
    ('instagram', 'Instagram Bot', 'Instagram auto-reply and DM automation', '📸', ARRAY['account_id', 'access_token'], ARRAY['webhook_url', 'message_templates'])
ON CONFLICT (platform) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bot_scripts_bot ON bot_scripts(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_scripts_current ON bot_scripts(is_current);
CREATE INDEX IF NOT EXISTS idx_access_logs_bot ON bot_access_logs(bot_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON bot_access_logs(user_id);

-- Enable RLS
ALTER TABLE platform_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_access_logs ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON platform_configs, bot_configurations, bot_scripts, bot_access_logs TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
