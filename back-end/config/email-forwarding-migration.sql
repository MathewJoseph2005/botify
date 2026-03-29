-- Email Forwarding Bot Migration
-- Supabase PostgreSQL Schema Setup
-- Created: Email Forwarding Configuration Feature

-- Main table for storing email forwarding configurations
CREATE TABLE IF NOT EXISTS email_forwarding_configs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  email VARCHAR(255) NOT NULL,
  password TEXT NOT NULL,
  forward_label VARCHAR(100) DEFAULT 'forward',
  recipient_emails TEXT[] NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  emails_checked BIGINT DEFAULT 0,
  emails_forwarded BIGINT DEFAULT 0,
  last_check_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_email_forwarding_configs_user_id 
  ON email_forwarding_configs(user_id);

CREATE INDEX IF NOT EXISTS idx_email_forwarding_configs_enabled_check 
  ON email_forwarding_configs(enabled, last_check_at);

-- Enable Row Level Security
ALTER TABLE email_forwarding_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS "Users can view their own email forwarding configs" 
  ON email_forwarding_configs 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can create their own email forwarding configs" 
  ON email_forwarding_configs 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update their own email forwarding configs" 
  ON email_forwarding_configs 
  FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can delete their own email forwarding configs" 
  ON email_forwarding_configs 
  FOR DELETE 
  USING (user_id = auth.uid());

-- Optional: Email forwarding logs table for audit trail
CREATE TABLE IF NOT EXISTS email_forwarding_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  config_id BIGINT NOT NULL REFERENCES email_forwarding_configs(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  email_from VARCHAR(255),
  email_subject VARCHAR(500),
  recipients_count INT,
  status VARCHAR(50),
  error_message TEXT,
  forwarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_forwarding_logs_config_id 
  ON email_forwarding_logs(config_id);

CREATE INDEX IF NOT EXISTS idx_email_forwarding_logs_user_id 
  ON email_forwarding_logs(user_id);

-- Enable RLS on logs table
ALTER TABLE email_forwarding_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own forwarding logs" 
  ON email_forwarding_logs 
  FOR SELECT 
  USING (user_id = auth.uid());
