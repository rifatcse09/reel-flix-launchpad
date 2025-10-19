-- Add plan_type column to referral_codes table
ALTER TABLE public.referral_codes 
ADD COLUMN plan_type text DEFAULT 'one-year';

COMMENT ON COLUMN public.referral_codes.plan_type IS 'Which subscription plan the discount applies to: one-year, six-months, one-month, or all-plans';