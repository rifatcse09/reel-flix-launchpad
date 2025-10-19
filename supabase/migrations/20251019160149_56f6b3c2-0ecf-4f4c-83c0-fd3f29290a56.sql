-- Revoke public access to materialized view (prevents API exposure)
REVOKE ALL ON public.referral_stats FROM anon, authenticated;
GRANT SELECT ON public.referral_stats TO authenticated;