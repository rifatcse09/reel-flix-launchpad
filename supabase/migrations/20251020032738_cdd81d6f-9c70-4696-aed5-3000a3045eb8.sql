-- Create referral clicks tracking table
CREATE TABLE public.referral_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  referrer_url TEXT,
  converted BOOLEAN NOT NULL DEFAULT false,
  session_id TEXT
);

-- Enable RLS
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

-- Admins can read all clicks
CREATE POLICY "Admins read referral clicks"
ON public.referral_clicks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can record a click (public endpoint will use service role)
CREATE POLICY "Anyone can record clicks"
ON public.referral_clicks
FOR INSERT
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_referral_clicks_code_id ON public.referral_clicks(code_id);
CREATE INDEX idx_referral_clicks_session_id ON public.referral_clicks(session_id);

-- Create referral alert thresholds table
CREATE TABLE public.referral_alert_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  threshold_type TEXT NOT NULL, -- 'revenue' or 'usage'
  threshold_value INTEGER NOT NULL,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(code_id, threshold_type, threshold_value)
);

-- Enable RLS
ALTER TABLE public.referral_alert_thresholds ENABLE ROW LEVEL SECURITY;

-- Admins manage alert thresholds
CREATE POLICY "Admins manage alert thresholds"
ON public.referral_alert_thresholds
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));