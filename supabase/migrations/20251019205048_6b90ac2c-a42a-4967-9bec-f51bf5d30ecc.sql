-- Add end date column to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS ends_at timestamp with time zone;

-- Update existing sample subscription with an end date (1 year from creation)
UPDATE public.subscriptions
SET ends_at = created_at + interval '1 year'
WHERE ends_at IS NULL;