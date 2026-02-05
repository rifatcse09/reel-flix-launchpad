-- Fix 1: Add foreign key constraint to subscriptions table
-- Using SET NULL to preserve subscription history when users are deleted
ALTER TABLE public.subscriptions
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT fk_subscriptions_user 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Fix 2: Fix function search_path for all functions that don't have it set
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.prepare_referral_code(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT UPPER(regexp_replace(raw, '[^A-Za-z0-9]', '', 'g'))
$function$;

CREATE OR REPLACE FUNCTION public.detect_device_type(user_agent_string text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
BEGIN
  IF user_agent_string IS NULL THEN
    RETURN 'unknown';
  END IF;

  -- Check for Smart TV
  IF user_agent_string ~* '(smart-tv|smarttv|googletv|appletv|roku|chromecast|firetv)' THEN
    RETURN 'smart_tv';
  END IF;

  -- Check for Mobile
  IF user_agent_string ~* '(android|iphone|ipod|blackberry|windows phone|mobile)' THEN
    RETURN 'mobile';
  END IF;

  -- Check for Tablet
  IF user_agent_string ~* '(ipad|tablet|kindle)' THEN
    RETURN 'tablet';
  END IF;

  -- Default to Desktop
  RETURN 'desktop';
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_notification_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix 3: Revoke API access from materialized view
REVOKE ALL ON public.referral_stats FROM anon, authenticated;

-- Fix 4: Fix permissive RLS policies - replace WITH CHECK (true) policies
-- referral_clicks: Anyone can record clicks - restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can record clicks" ON public.referral_clicks;
CREATE POLICY "Authenticated users can record clicks" 
ON public.referral_clicks 
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- referral_uses: Anyone can record referral use - restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can record referral use" ON public.referral_uses;
CREATE POLICY "Authenticated users can record referral use" 
ON public.referral_uses 
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- trial_ip_usage: System can insert - this is used by edge functions with service role
-- Keep as is since it's only accessed via service role key in edge functions