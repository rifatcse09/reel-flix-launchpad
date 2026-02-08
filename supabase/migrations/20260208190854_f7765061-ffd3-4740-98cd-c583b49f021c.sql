
-- Add new granular admin roles to the enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support_agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'billing_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analyst';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fulfillment_agent';
