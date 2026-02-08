
-- Remove WHMCS-related columns from referral_codes
ALTER TABLE public.referral_codes DROP COLUMN IF EXISTS whmcs_affiliate_id;

-- Remove WHMCS-related columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS whmcs_client_id;

-- Remove WHMCS-related columns from plans
ALTER TABLE public.plans DROP COLUMN IF EXISTS whmcs_pid;
