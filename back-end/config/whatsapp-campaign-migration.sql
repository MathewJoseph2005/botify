-- Migration: WhatsApp Campaign Tracking
-- PREREQUISITE: Run supabase-migration.sql first to create the users table
-- Then run this in your Supabase SQL Editor to add WhatsApp campaign tracking

CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    campaign_name VARCHAR(200) NOT NULL,
    message_body TEXT NOT NULL,
    total_recipients INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sending', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for WhatsApp campaign tracking
CREATE INDEX IF NOT EXISTS idx_wa_campaigns_user_id ON whatsapp_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_campaigns_status ON whatsapp_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_wa_campaigns_created_at ON whatsapp_campaigns(created_at);

-- Enable RLS
ALTER TABLE whatsapp_campaigns ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON whatsapp_campaigns TO anon, authenticated;
GRANT ALL ON SEQUENCE whatsapp_campaigns_id_seq TO anon, authenticated;
