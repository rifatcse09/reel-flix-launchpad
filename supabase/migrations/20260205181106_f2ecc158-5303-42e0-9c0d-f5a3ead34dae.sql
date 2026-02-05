-- Fix remaining trial_ip_usage permissive policy
DROP POLICY IF EXISTS "System can insert trial IP records" ON public.trial_ip_usage;
-- Only allow service role access (via edge functions) - no direct user inserts
-- The trial_ip_usage table is only written to by edge functions using service role key
-- So we create a policy that denies all authenticated user inserts but allows service role
CREATE POLICY "Only service role can insert trial IP records" 
ON public.trial_ip_usage 
FOR INSERT
WITH CHECK (false);  -- This blocks anon/authenticated but service role bypasses RLS