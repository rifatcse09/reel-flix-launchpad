-- Drop the current restrictive policy that requires authentication
DROP POLICY IF EXISTS "Authenticated users can read active referral codes" ON public.referral_codes;

-- Create a permissive policy allowing anyone (including unauthenticated visitors) to read active, non-expired codes
CREATE POLICY "Anyone can read active referral codes"
ON public.referral_codes
FOR SELECT
USING (active = true AND (expires_at IS NULL OR expires_at > now()));
