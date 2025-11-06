-- Add column to profiles to store the referral code used at signup
-- This allows automatic application of referral benefits when purchasing subscriptions
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS used_referral_code TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_used_referral_code 
ON public.profiles(used_referral_code) 
WHERE used_referral_code IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.used_referral_code IS 'The referral code this user used when signing up, to be applied to their first subscription purchase';