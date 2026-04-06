-- Vibe Code Sessions Table for persisting user workspace state
-- Run in Supabase SQL editor to enable session resumption after login

CREATE TABLE IF NOT EXISTS public.vibe_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  chat_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_file_path TEXT,
  terminal_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_draft TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Index for fast user session lookup
CREATE INDEX IF NOT EXISTS idx_vibe_sessions_user_active
  ON public.vibe_sessions(user_id, is_active DESC, updated_at DESC);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_vibe_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the update function
DROP TRIGGER IF EXISTS trigger_vibe_sessions_updated_at ON public.vibe_sessions;
CREATE TRIGGER trigger_vibe_sessions_updated_at
  BEFORE UPDATE ON public.vibe_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vibe_sessions_updated_at();

-- Note: RLS not needed here since authentication is handled by JWT middleware in the backend.
-- Backend verifyToken middleware ensures only the session owner can access their data.
