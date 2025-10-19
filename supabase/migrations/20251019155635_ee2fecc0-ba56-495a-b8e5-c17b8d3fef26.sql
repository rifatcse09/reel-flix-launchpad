-- Create role enum (using DO block for conditional creation)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table for proper role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy for user_roles
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Referral codes table
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  max_uses INT,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT code_uppercase CHECK (code = UPPER(code))
);

-- Referral uses (track every landing with ?ref=CODE)
CREATE TABLE IF NOT EXISTS public.referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  visitor_id UUID,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);

-- Subscriptions (recorded via webhook)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan TEXT NOT NULL,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  processor TEXT NOT NULL DEFAULT 'stripe',
  processor_invoice_id TEXT,
  referral_code_id UUID REFERENCES public.referral_codes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_uses_code_id ON public.referral_uses (code_id, created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_referral ON public.subscriptions (referral_code_id, status, paid_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON public.referral_codes (active, expires_at);

-- Helper function to prepare referral codes
CREATE OR REPLACE FUNCTION public.prepare_referral_code(raw TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT UPPER(regexp_replace(raw, '[^A-Za-z0-9]', '', 'g'))
$$;

-- Materialized view for dashboard stats
CREATE MATERIALIZED VIEW IF NOT EXISTS public.referral_stats AS
SELECT
  rc.id AS code_id,
  rc.code,
  rc.label,
  rc.active,
  rc.expires_at,
  rc.max_uses,
  rc.created_at,
  (SELECT COUNT(*) FROM public.referral_uses ru WHERE ru.code_id = rc.id) AS total_uses,
  (SELECT COUNT(*) FROM public.subscriptions s WHERE s.referral_code_id = rc.id AND s.status IN ('active','paid')) AS paid_subscriptions,
  COALESCE((SELECT SUM(s.amount_cents) FROM public.subscriptions s WHERE s.referral_code_id = rc.id AND s.status IN ('active','paid')), 0) AS revenue_cents
FROM public.referral_codes rc;

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can access referral system
CREATE POLICY "Admins manage referral codes"
ON public.referral_codes
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read referral uses"
ON public.referral_uses
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read subscriptions"
ON public.subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Public insert policy for referral uses (anyone can record a use)
CREATE POLICY "Anyone can record referral use"
ON public.referral_uses
FOR INSERT
WITH CHECK (true);

-- Function to refresh stats (call from edge function)
CREATE OR REPLACE FUNCTION public.refresh_referral_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.referral_stats;
END;
$$;