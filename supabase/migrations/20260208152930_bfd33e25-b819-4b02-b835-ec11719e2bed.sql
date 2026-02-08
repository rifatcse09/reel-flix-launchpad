
-- Add provisioning_status column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN provisioning_status text NOT NULL DEFAULT 'pending_provision';

-- Add provisioned_at timestamp
ALTER TABLE public.subscriptions 
ADD COLUMN provisioned_at timestamp with time zone;

-- Add provisioned_by (admin user id)
ALTER TABLE public.subscriptions 
ADD COLUMN provisioned_by uuid;

-- Create index for admin queue queries
CREATE INDEX idx_subscriptions_provisioning_status 
ON public.subscriptions (provisioning_status) 
WHERE provisioning_status = 'pending_provision';

-- Insert feature flag: AUTO_PROVISION = FALSE
INSERT INTO public.app_settings (category, key, value)
VALUES ('provisioning', 'AUTO_PROVISION', 'false'::jsonb)
ON CONFLICT DO NOTHING;

-- Update existing active subscriptions to 'provisioned' so they don't appear in the queue
UPDATE public.subscriptions 
SET provisioning_status = 'provisioned' 
WHERE status = 'active';

-- Update existing pending subscriptions to 'pending_provision'
UPDATE public.subscriptions 
SET provisioning_status = 'pending_provision' 
WHERE status = 'pending';

-- Allow admins to update subscriptions (needed for MARK AS SENT)
CREATE POLICY "Admins can update subscriptions"
ON public.subscriptions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert subscriptions (needed for edge functions via service role, but also admin manual)
CREATE POLICY "Admins can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
