
-- ============================================================
-- INTERNAL INVOICING SYSTEM RESTRUCTURE
-- Replace orders-based model with invoices-centered model
-- ============================================================

-- 1. Drop old tables (all empty, safe to drop)
DROP TABLE IF EXISTS public.fulfillment CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;

-- Drop old sequence
DROP SEQUENCE IF EXISTS public.invoice_number_seq;

-- Drop old trigger function
DROP FUNCTION IF EXISTS public.generate_invoice_number() CASCADE;

-- ============================================================
-- 2. Invoice number sequence & generator
-- ============================================================
CREATE SEQUENCE public.rf_invoice_seq START WITH 100;

CREATE OR REPLACE FUNCTION public.generate_rf_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'RF-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(nextval('public.rf_invoice_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- 3. INVOICES table (replaces orders)
-- ============================================================
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL DEFAULT '',
  user_id uuid NOT NULL,
  plan_id integer REFERENCES public.plans(id),
  subscription_id uuid REFERENCES public.subscriptions(id),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'unpaid',
  issued_at timestamptz DEFAULT now(),
  due_at timestamptz,
  paid_at timestamptz,
  notes text,
  referral_code_id uuid REFERENCES public.referral_codes(id),
  discount_cents integer NOT NULL DEFAULT 0,
  plan_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint on invoice_number (excluding empty default)
CREATE UNIQUE INDEX idx_invoices_number ON public.invoices(invoice_number) WHERE invoice_number != '';

-- Auto-generate invoice number
CREATE TRIGGER generate_rf_invoice_number_trigger
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_rf_invoice_number();

-- Auto-update updated_at
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all invoices"
  ON public.invoices FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 4. PAYMENTS table (linked to invoices)
-- ============================================================
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  user_id uuid NOT NULL,
  method text NOT NULL DEFAULT 'crypto',
  provider text,
  tx_hash text,
  chain text,
  from_address text,
  to_address text,
  amount_received_cents integer,
  currency text NOT NULL DEFAULT 'USD',
  received_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  processor_data jsonb,
  processor_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all payments"
  ON public.payments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 5. FULFILLMENT table (linked to invoices)
-- ============================================================
CREATE TABLE public.fulfillment (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending_manual_provisioning',
  sent_at timestamptz,
  sent_by_admin_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER fulfillment_updated_at
  BEFORE UPDATE ON public.fulfillment
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.fulfillment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fulfillment"
  ON public.fulfillment FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all fulfillment"
  ON public.fulfillment FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
