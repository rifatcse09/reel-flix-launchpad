
-- 1. Account Credits table
CREATE TABLE public.account_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  reason text NOT NULL,
  source_type text NOT NULL DEFAULT 'refund', -- 'refund', 'manual', 'promotional'
  source_id uuid, -- optional reference to invoice, etc.
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_to_invoice_id uuid REFERENCES public.invoices(id),
  applied_at timestamptz
);

ALTER TABLE public.account_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage credits" ON public.account_credits
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own credits" ON public.account_credits
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Retry Queue table
CREATE TABLE public.retry_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL, -- 'email', 'fulfillment', 'webhook'
  operation_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'retrying', 'succeeded', 'failed', 'exhausted'
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  resolved_at timestamptz,
  resolved_by uuid
);

ALTER TABLE public.retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage retry queue" ON public.retry_queue
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Operational Alerts table
CREATE TABLE public.operational_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL, -- 'webhook_failure', 'payment_stuck', 'fulfillment_stuck', 'email_failure'
  severity text NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  title text NOT NULL,
  message text NOT NULL,
  entity_type text,
  entity_id text,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage alerts" ON public.operational_alerts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Add refund tracking to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS refunded_by uuid;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS refund_amount_cents integer DEFAULT 0;

-- Update invoice status transition to allow 'refunded'
CREATE OR REPLACE FUNCTION public.validate_invoice_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  valid boolean := false;
BEGIN
  CASE OLD.status
    WHEN 'unpaid' THEN
      valid := NEW.status IN ('paid', 'void');
    WHEN 'paid' THEN
      valid := NEW.status IN ('void', 'refunded');
    WHEN 'refunded' THEN
      valid := false; -- Terminal state
    WHEN 'void' THEN
      valid := false; -- Terminal state
    WHEN 'draft' THEN
      valid := NEW.status IN ('unpaid', 'void');
    ELSE
      valid := true;
  END CASE;

  IF NOT valid THEN
    RAISE EXCEPTION 'Invalid invoice status transition: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for retry_queue updated_at
CREATE TRIGGER update_retry_queue_updated_at
  BEFORE UPDATE ON public.retry_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
