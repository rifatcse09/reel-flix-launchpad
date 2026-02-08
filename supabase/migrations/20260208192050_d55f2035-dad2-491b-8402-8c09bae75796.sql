
-- =============================================
-- 1. Staff Activity Log
-- =============================================
CREATE TABLE public.staff_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_email text,
  action_type text NOT NULL, -- login, view, change, impersonation, refund, retry, role_change, delete, export
  entity_type text, -- user, invoice, payment, subscription, fulfillment, referral, notification, system
  entity_id text,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins and admins can view staff activity"
  ON public.staff_activity_log FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Any admin can insert staff activity"
  ON public.staff_activity_log FOR INSERT
  WITH CHECK (has_any_admin_role(auth.uid()));

CREATE INDEX idx_staff_activity_created ON public.staff_activity_log (created_at DESC);
CREATE INDEX idx_staff_activity_admin ON public.staff_activity_log (admin_id);
CREATE INDEX idx_staff_activity_action ON public.staff_activity_log (action_type);

-- =============================================
-- 2. Legal Acceptances
-- =============================================
CREATE TABLE public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_type text NOT NULL, -- terms_of_service, privacy_policy
  document_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own acceptances"
  ON public.legal_acceptances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own acceptances"
  ON public.legal_acceptances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all acceptances"
  ON public.legal_acceptances FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_legal_acceptances_user ON public.legal_acceptances (user_id);
CREATE INDEX idx_legal_acceptances_doc ON public.legal_acceptances (document_type, document_version);

-- =============================================
-- 3. Fraud Markers
-- =============================================
CREATE TABLE public.fraud_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  marker_type text NOT NULL, -- multi_account_ip, repeated_failed_payments, abnormal_signup_velocity
  severity text NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud markers"
  ON public.fraud_markers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_fraud_markers_user ON public.fraud_markers (user_id);
CREATE INDEX idx_fraud_markers_type ON public.fraud_markers (marker_type);
CREATE INDEX idx_fraud_markers_severity ON public.fraud_markers (severity);
CREATE INDEX idx_fraud_markers_unresolved ON public.fraud_markers (user_id) WHERE resolved_at IS NULL;
