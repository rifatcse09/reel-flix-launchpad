-- Add WHMCS affiliate ID to referral codes table
ALTER TABLE public.referral_codes 
ADD COLUMN whmcs_affiliate_id integer;

COMMENT ON COLUMN public.referral_codes.whmcs_affiliate_id IS 'The WHMCS affiliate ID to associate orders with this referral code';