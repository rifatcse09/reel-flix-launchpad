
-- =============================================
-- 1. RUNBOOKS
-- =============================================
CREATE TABLE public.runbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  content text NOT NULL DEFAULT '',
  tags text[] DEFAULT '{}',
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.runbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage runbooks" ON public.runbooks
  FOR ALL USING (has_any_admin_role(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_runbooks_updated_at
  BEFORE UPDATE ON public.runbooks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Link runbooks to incidents
CREATE TABLE public.runbook_incident_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runbook_id uuid NOT NULL REFERENCES public.runbooks(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  linked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(runbook_id, incident_id)
);

ALTER TABLE public.runbook_incident_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage runbook incident links" ON public.runbook_incident_links
  FOR ALL USING (has_any_admin_role(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. ELEVATION REQUESTS
-- =============================================
CREATE TABLE public.elevation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  requested_role text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  denied_by uuid,
  denied_at timestamptz,
  denial_reason text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.elevation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all elevation requests" ON public.elevation_requests
  FOR SELECT USING (has_any_admin_role(auth.uid()));

CREATE POLICY "Admins can insert elevation requests" ON public.elevation_requests
  FOR INSERT WITH CHECK (has_any_admin_role(auth.uid()) AND auth.uid() = requester_id);

CREATE POLICY "Super admins can update elevation requests" ON public.elevation_requests
  FOR UPDATE USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_elevation_requests_updated_at
  BEFORE UPDATE ON public.elevation_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 3. DATA LIFECYCLE EVENTS
-- =============================================
CREATE TABLE public.data_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- retention_set, deletion_marked, anonymization, deletion_completed
  entity_type text NOT NULL,
  entity_id text,
  performed_by uuid NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage data lifecycle events" ON public.data_lifecycle_events
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 4. RETENTION POLICIES
-- =============================================
CREATE TABLE public.retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL UNIQUE,
  retention_days integer NOT NULL DEFAULT 365,
  description text,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage retention policies" ON public.retention_policies
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_retention_policies_updated_at
  BEFORE UPDATE ON public.retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed default runbooks
INSERT INTO public.runbooks (title, category, content, tags, created_by) VALUES
(
  'Payment Stuck - Resolution Procedure',
  'payments',
  E'## When to Use\nA payment shows as "pending" for more than 30 minutes.\n\n## Steps\n1. Check the **Payments Queue** for the stuck payment\n2. Verify the payment status in the payment provider dashboard\n3. Check `system_event_log` for related errors\n4. If confirmed received, manually update status to "confirmed"\n5. If not received, contact the customer and offer alternatives\n\n## Escalation\n- If payment is stuck for > 24h, escalate to billing_admin\n- If multiple payments stuck, create an incident',
  ARRAY['payment', 'stuck', 'pending', 'resolution'],
  '00000000-0000-0000-0000-000000000000'
),
(
  'Webhook Failure - Troubleshooting',
  'webhooks',
  E'## When to Use\nWebhook processing shows failures or degraded status.\n\n## Steps\n1. Check **Service Status** dashboard for webhook health\n2. Review recent entries in `system_event_log` with event_type containing "webhook"\n3. Check if the external service is responding (NOWPayments, WHMCS)\n4. Verify webhook secrets are still valid\n5. Check retry queue for failed webhooks\n\n## Common Causes\n- External service downtime\n- Expired API keys\n- Network connectivity issues\n- Payload format changes',
  ARRAY['webhook', 'failure', 'troubleshooting', 'nowpayments'],
  '00000000-0000-0000-0000-000000000000'
),
(
  'Customer Refund Process',
  'billing',
  E'## When to Use\nCustomer requests a refund or chargeback is initiated.\n\n## Steps\n1. Verify the invoice and payment in **Revenue** page\n2. Confirm refund eligibility per company policy\n3. Open the invoice and click "Refund"\n4. Enter the refund amount and reason\n5. Process the refund through the payment provider\n6. Verify account credit is created automatically\n7. Notify the customer\n\n## Important\n- Refunds require `refund_payments` permission\n- All refunds are logged in staff_activity_log\n- Partial refunds create account credits',
  ARRAY['refund', 'customer', 'billing', 'chargeback'],
  '00000000-0000-0000-0000-000000000000'
),
(
  'Fraud Review Procedure',
  'security',
  E'## When to Use\nFraud markers are detected or suspicious activity is reported.\n\n## Steps\n1. Review the fraud markers in **User Details** panel\n2. Check user session history for suspicious patterns\n3. Verify payment methods and transaction history\n4. Check for multiple accounts from same IP\n5. Review trial_ip_usage for abuse patterns\n\n## Decision Matrix\n- **Low risk**: Monitor, add internal note\n- **Medium risk**: Suspend account, contact user\n- **High risk**: Suspend account, block payment method, escalate\n- **Critical**: Immediate account suspension, incident creation\n\n## Escalation\nAlways create an incident for critical fraud cases',
  ARRAY['fraud', 'review', 'security', 'suspicious'],
  '00000000-0000-0000-0000-000000000000'
);

-- Seed default retention policies
INSERT INTO public.retention_policies (entity_type, retention_days, description, created_by) VALUES
('system_event_log', 90, 'System event logs retained for 90 days', '00000000-0000-0000-0000-000000000000'),
('staff_activity_log', 365, 'Staff activity logs retained for 1 year', '00000000-0000-0000-0000-000000000000'),
('user_sessions', 180, 'User session data retained for 6 months', '00000000-0000-0000-0000-000000000000'),
('referral_clicks', 365, 'Referral click tracking data retained for 1 year', '00000000-0000-0000-0000-000000000000'),
('notification_reads', 90, 'Notification read receipts retained for 90 days', '00000000-0000-0000-0000-000000000000');
