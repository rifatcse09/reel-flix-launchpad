-- Create table to track trial usage by IP address
CREATE TABLE public.trial_ip_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_ip_usage ENABLE ROW LEVEL SECURITY;

-- Create index for faster IP lookups
CREATE INDEX idx_trial_ip_usage_ip_address ON public.trial_ip_usage(ip_address);

-- Policy: Admins can view all trial IP usage
CREATE POLICY "Admins can view all trial IP usage"
ON public.trial_ip_usage
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: System can insert trial IP records
CREATE POLICY "System can insert trial IP records"
ON public.trial_ip_usage
FOR INSERT
WITH CHECK (true);