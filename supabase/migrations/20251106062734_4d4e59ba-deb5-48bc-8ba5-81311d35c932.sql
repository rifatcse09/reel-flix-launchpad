-- Allow anyone to read referral codes for validation
CREATE POLICY "Anyone can read referral codes"
ON public.referral_codes
FOR SELECT
USING (true);