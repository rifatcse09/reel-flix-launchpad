-- Add WHMCS and trial-related fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whmcs_client_id text,
  ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone;