
-- Add email tracking to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS last_email_sent_at timestamptz DEFAULT NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS last_email_type text DEFAULT NULL;
