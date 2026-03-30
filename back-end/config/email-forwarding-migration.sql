-- Email Forwarding Bot Migration
-- Supabase PostgreSQL Schema Setup

-- Clean Slate Deployment
DROP TABLE IF EXISTS email_forwarding_logs;
DROP TABLE IF EXISTS email_forwarding_configs;

-- Main table for storing email forwarding configurations
CREATE TABLE IF NOT EXISTS email_forwarding_configs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL, -- BIGINT matching your custom primary user ID
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

CREATE INDEX IF NOT EXISTS idx_email_forwarding_configs_user_id ON email_forwarding_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_forwarding_configs_enabled_check ON email_forwarding_configs(enabled, last_check_at);

-- Set Security Policies (Backend service role bypasses this)
ALTER TABLE email_forwarding_configs ENABLE ROW LEVEL SECURITY;
-- Safely drop existing policy to recreate it
DROP POLICY IF EXISTS "Configs Access" ON email_forwarding_configs;
CREATE POLICY "Configs Access" ON email_forwarding_configs USING (true);

-- Email forwarding logs table for audit trail and dashboard charts
CREATE TABLE IF NOT EXISTS email_forwarding_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  config_id BIGINT NOT NULL REFERENCES email_forwarding_configs(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL, -- BIGINT mapping
  email_from VARCHAR(255),
  email_subject VARCHAR(500),
  recipients_count INT,
  status VARCHAR(50),
  error_message TEXT,
  forwarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_forwarding_logs_config_id ON email_forwarding_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_email_forwarding_logs_user_id ON email_forwarding_logs(user_id);

ALTER TABLE email_forwarding_logs ENABLE ROW LEVEL SECURITY;
-- Safely drop existing policy to recreate it
DROP POLICY IF EXISTS "Logs Access" ON email_forwarding_logs;
CREATE POLICY "Logs Access" ON email_forwarding_logs USING (true);

-- High-performance increment RPC for emails_checked
CREATE OR REPLACE FUNCTION increment_emails_checked(_config_id BIGINT, _count INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE email_forwarding_configs
  SET emails_checked = emails_checked + _count,
      last_check_at = CURRENT_TIMESTAMP
  WHERE id = _config_id;
END;
$$;
