-- Add columns for player link, M3U link, and referral code to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS player_link TEXT,
ADD COLUMN IF NOT EXISTS m3u_link TEXT,
ADD COLUMN IF NOT EXISTS referral_code TEXT;