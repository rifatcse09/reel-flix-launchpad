-- Add discount and trial fields to referral_codes table
ALTER TABLE public.referral_codes 
ADD COLUMN IF NOT EXISTS discount_amount_cents INTEGER DEFAULT 2000,
ADD COLUMN IF NOT EXISTS trial_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'both' CHECK (discount_type IN ('trial', 'discount', 'both'));

-- Add a comment to explain the fields
COMMENT ON COLUMN public.referral_codes.discount_amount_cents IS 'Discount amount in cents (e.g., 2000 = $20)';
COMMENT ON COLUMN public.referral_codes.trial_hours IS 'Number of hours for free trial (e.g., 24 = 24 hours)';
COMMENT ON COLUMN public.referral_codes.discount_type IS 'Type of benefit: trial, discount, or both';