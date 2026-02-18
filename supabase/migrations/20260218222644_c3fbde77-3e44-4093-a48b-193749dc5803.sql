-- Fix 1: Restrict referral_codes to authenticated users only (drop public access)
DROP POLICY IF EXISTS "Anyone can read referral codes" ON public.referral_codes;

CREATE POLICY "Authenticated users can read active referral codes"
  ON public.referral_codes
  FOR SELECT
  TO authenticated
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

-- Fix 2: Clean up trial_ip_usage contradictory policy
-- Remove the overly broad RESTRICTIVE auth policy that conflicts with the service-role-only insert
DROP POLICY IF EXISTS "Require authentication for trial_ip_usage" ON public.trial_ip_usage;

-- The design is correct: only service role can write (WITH CHECK false blocks client inserts)
-- and admins can read. Document this with a clear comment policy.
-- No new policies needed - existing "Only service role can insert trial IP records" and
-- "Admins can view all trial IP usage" are sufficient and correct.
