
-- 1. Trigger: auto-create fulfillment row when invoice status changes to 'paid'
CREATE OR REPLACE FUNCTION public.auto_create_fulfillment_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status changes TO 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    -- Avoid duplicate: only insert if no fulfillment row exists for this invoice
    INSERT INTO public.fulfillment (invoice_id, user_id, status)
    SELECT NEW.id, NEW.user_id, 'pending_manual_provisioning'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.fulfillment WHERE invoice_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_fulfillment_on_invoice_paid
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_fulfillment_on_paid();

-- 2. Internal admin notes table
CREATE TABLE public.admin_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,  -- 'invoice', 'payment', 'fulfillment'
  entity_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  admin_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can CRUD admin notes
CREATE POLICY "Admins manage admin notes"
  ON public.admin_notes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_admin_notes_entity ON public.admin_notes (entity_type, entity_id);
CREATE INDEX idx_admin_notes_created ON public.admin_notes (created_at DESC);
