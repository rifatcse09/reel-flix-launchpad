
-- Fix security warning: set search_path on refresh_referral_stats
CREATE OR REPLACE FUNCTION public.refresh_referral_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.referral_stats;
END;
$$;
