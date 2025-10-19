-- Create user_sessions table to track device usage
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type text NOT NULL, -- mobile, tablet, desktop, smart_tv
  browser text,
  os text,
  ip_address text,
  user_agent text,
  last_accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.user_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.user_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_device_type ON public.user_sessions(device_type);
CREATE INDEX idx_user_sessions_last_accessed ON public.user_sessions(last_accessed_at);

-- Function to detect device type from user agent
CREATE OR REPLACE FUNCTION public.detect_device_type(user_agent_string text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF user_agent_string IS NULL THEN
    RETURN 'unknown';
  END IF;

  -- Check for Smart TV
  IF user_agent_string ~* '(smart-tv|smarttv|googletv|appletv|roku|chromecast|firetv)' THEN
    RETURN 'smart_tv';
  END IF;

  -- Check for Mobile
  IF user_agent_string ~* '(android|iphone|ipod|blackberry|windows phone|mobile)' THEN
    RETURN 'mobile';
  END IF;

  -- Check for Tablet
  IF user_agent_string ~* '(ipad|tablet|kindle)' THEN
    RETURN 'tablet';
  END IF;

  -- Default to Desktop
  RETURN 'desktop';
END;
$$;