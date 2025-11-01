-- Add RLS policy to block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add RLS policy to block anonymous access to user_sessions table  
CREATE POLICY "Block anonymous access to user_sessions"
ON public.user_sessions
FOR SELECT
USING (auth.uid() IS NOT NULL);