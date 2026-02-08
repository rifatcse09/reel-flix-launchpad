
-- ============================================================
-- 1. SYSTEM EVENT LOG TABLE
-- ============================================================
CREATE TABLE public.system_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid
);

-- Index for fast lookups by entity
CREATE INDEX idx_system_event_log_entity ON public.system_event_log (entity_type, entity_id);
CREATE INDEX idx_system_event_log_event_type ON public.system_event_log (event_type);
CREATE INDEX idx_system_event_log_created_at ON public.system_event_log (created_at DESC);
CREATE INDEX idx_system_event_log_status ON public.system_event_log (status) WHERE status = 'fail';

-- Enable RLS
ALTER TABLE public.system_event_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read, no one can write via client (edge functions use service role)
CREATE POLICY "Admins can view system event log"
  ON public.system_event_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Block all client-side writes (service role bypasses RLS)
CREATE POLICY "No client writes to system event log"
  ON public.system_event_log
  FOR INSERT
  WITH CHECK (false);

-- ============================================================
-- 2. GUARDRAIL: Unique constraint to prevent duplicate fulfillment per invoice
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_fulfillment_unique_invoice 
  ON public.fulfillment (invoice_id) 
  WHERE status != 'cancelled';

-- ============================================================
-- 3. GUARDRAIL: Prevent duplicate pending payments per invoice
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_pending_invoice 
  ON public.payments (invoice_id) 
  WHERE status = 'pending';

-- ============================================================
-- 4. GUARDRAIL: Status transition validation trigger for invoices
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_invoice_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  valid boolean := false;
BEGIN
  -- Define valid transitions
  CASE OLD.status
    WHEN 'unpaid' THEN
      valid := NEW.status IN ('paid', 'void');
    WHEN 'paid' THEN
      valid := NEW.status IN ('void'); -- Can only void a paid invoice
    WHEN 'void' THEN
      valid := false; -- Terminal state
    WHEN 'draft' THEN
      valid := NEW.status IN ('unpaid', 'void');
    ELSE
      valid := true; -- Unknown states can transition freely
  END CASE;

  IF NOT valid THEN
    RAISE EXCEPTION 'Invalid invoice status transition: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_invoice_status
  BEFORE UPDATE OF status ON public.invoices
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.validate_invoice_status_transition();

-- ============================================================
-- 5. GUARDRAIL: Status transition validation trigger for payments
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_payment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  valid boolean := false;
BEGIN
  CASE OLD.status
    WHEN 'pending' THEN
      valid := NEW.status IN ('confirmed', 'failed');
    WHEN 'confirmed' THEN
      valid := NEW.status IN ('failed'); -- Refund/chargeback scenario
    WHEN 'failed' THEN
      valid := false; -- Terminal state
    ELSE
      valid := true;
  END CASE;

  IF NOT valid THEN
    RAISE EXCEPTION 'Invalid payment status transition: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_payment_status
  BEFORE UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.validate_payment_status_transition();

-- ============================================================
-- 6. GUARDRAIL: Status transition for subscriptions
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_subscription_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  valid boolean := false;
BEGIN
  CASE OLD.status
    WHEN 'pending' THEN
      valid := NEW.status IN ('active', 'canceled');
    WHEN 'active' THEN
      valid := NEW.status IN ('suspended', 'canceled', 'expired');
    WHEN 'suspended' THEN
      valid := NEW.status IN ('active', 'canceled');
    WHEN 'canceled' THEN
      valid := false; -- Terminal
    WHEN 'expired' THEN
      valid := false; -- Terminal
    ELSE
      valid := true;
  END CASE;

  IF NOT valid THEN
    RAISE EXCEPTION 'Invalid subscription status transition: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_subscription_status
  BEFORE UPDATE OF status ON public.subscriptions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.validate_subscription_status_transition();

-- ============================================================
-- 7. AUTO-LOG: Trigger to log invoice status changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_invoice_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_event_log (event_type, entity_type, entity_id, metadata, status)
  VALUES (
    CASE NEW.status
      WHEN 'paid' THEN 'invoice_paid'
      WHEN 'void' THEN 'invoice_voided'
      ELSE 'invoice_status_changed'
    END,
    'invoice',
    NEW.id::text,
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'invoice_number', NEW.invoice_number,
      'amount_cents', NEW.amount_cents,
      'user_id', NEW.user_id
    ),
    'success'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_invoice_status_change
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_invoice_status_change();

-- ============================================================
-- 8. AUTO-LOG: Trigger to log fulfillment events
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_fulfillment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.system_event_log (event_type, entity_type, entity_id, metadata, status)
    VALUES (
      'moved_to_fulfillment',
      'fulfillment',
      NEW.id::text,
      jsonb_build_object('invoice_id', NEW.invoice_id, 'user_id', NEW.user_id, 'status', NEW.status),
      'success'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.system_event_log (event_type, entity_type, entity_id, metadata, status)
    VALUES (
      CASE NEW.status
        WHEN 'sent' THEN 'fulfillment_marked_sent'
        ELSE 'fulfillment_status_changed'
      END,
      'fulfillment',
      NEW.id::text,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'invoice_id', NEW.invoice_id,
        'user_id', NEW.user_id,
        'sent_by', NEW.sent_by_admin_id
      ),
      'success'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_fulfillment_event
  AFTER INSERT OR UPDATE ON public.fulfillment
  FOR EACH ROW
  EXECUTE FUNCTION public.log_fulfillment_event();

-- ============================================================
-- 9. AUTO-LOG: Trigger to log payment status changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_payment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_event_log (event_type, entity_type, entity_id, metadata, status)
  VALUES (
    CASE NEW.status
      WHEN 'confirmed' THEN 'payment_confirmed'
      WHEN 'failed' THEN 'payment_failed'
      ELSE 'payment_status_changed'
    END,
    'payment',
    NEW.id::text,
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'invoice_id', NEW.invoice_id,
      'user_id', NEW.user_id,
      'amount_received_cents', NEW.amount_received_cents,
      'provider', NEW.provider
    ),
    'success'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_payment_status_change
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_payment_status_change();

-- ============================================================
-- 10. AUTO-LOG: Trigger to log subscription status changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_subscription_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_event_log (event_type, entity_type, entity_id, metadata, status)
  VALUES (
    CASE NEW.status
      WHEN 'active' THEN 'subscription_activated'
      WHEN 'canceled' THEN 'subscription_canceled'
      WHEN 'suspended' THEN 'subscription_suspended'
      ELSE 'subscription_status_changed'
    END,
    'subscription',
    NEW.id::text,
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'user_id', NEW.user_id,
      'plan', NEW.plan,
      'provisioning_status', NEW.provisioning_status
    ),
    'success'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_subscription_status_change
  AFTER UPDATE OF status ON public.subscriptions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_subscription_status_change();

-- ============================================================
-- 11. AUTO-LOG: Log new invoice creation
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_invoice_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_event_log (event_type, entity_type, entity_id, metadata, status)
  VALUES (
    'invoice_created',
    'invoice',
    NEW.id::text,
    jsonb_build_object(
      'invoice_number', NEW.invoice_number,
      'user_id', NEW.user_id,
      'amount_cents', NEW.amount_cents,
      'plan_name', NEW.plan_name,
      'status', NEW.status
    ),
    'success'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_invoice_created
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invoice_created();
