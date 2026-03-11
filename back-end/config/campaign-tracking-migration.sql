-- Migration: Email Campaign Tracking
-- PREREQUISITE: Run supabase-migration.sql first to create the users and bots tables
-- Then run this in your Supabase SQL Editor to add campaign tracking

CREATE TABLE IF NOT EXISTS email_campaigns (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    bot_id BIGINT NOT NULL,
    bot_name VARCHAR(100) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sending', 'completed', 'scheduled', 'failed'
    scheduled_for TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (bot_id) REFERENCES bots(bot_id) ON DELETE CASCADE
);

-- Indexes for campaign tracking
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_bot_id ON email_campaigns(bot_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON email_campaigns(created_at);

-- Enable RLS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON email_campaigns TO anon, authenticated;
GRANT ALL ON SEQUENCE email_campaigns_id_seq TO anon, authenticated;
