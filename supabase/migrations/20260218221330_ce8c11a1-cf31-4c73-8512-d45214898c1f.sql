
-- Fix 1: Profiles table - ensure tight RLS, no public access to PII
-- Drop any overly permissive existing SELECT policies and replace with strict ones

-- Add explicit policy: users can only read their own profile
DO $$
BEGIN
  -- Drop if exists to avoid conflicts
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
END $$;

-- Users can view only their own profile (no public access)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update only their own profile
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
END $$;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins (any admin role) can view all profiles
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
END $$;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (has_any_admin_role(auth.uid()));

-- Admins can update all profiles
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
END $$;

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (has_any_admin_role(auth.uid()))
  WITH CHECK (has_any_admin_role(auth.uid()));

-- Fix 2: Invoices - extend admin SELECT to all admin roles (not just 'admin')
-- Support agents and billing admins need to view invoices too

DO $$
BEGIN
  DROP POLICY IF EXISTS "Billing admins and support can view invoices" ON public.invoices;
  DROP POLICY IF EXISTS "All admins can view invoices" ON public.invoices;
END $$;

CREATE POLICY "All admins can view invoices"
  ON public.invoices
  FOR SELECT
  USING (has_any_admin_role(auth.uid()));
