-- Fix the RLS vulnerability: Remove the overly permissive policy that allows any authenticated user to read all profiles
-- The existing "Users can view their own profile" and "Admins can view all profiles" policies are sufficient

DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;