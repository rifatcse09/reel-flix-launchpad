
-- Backup status tracking
CREATE TABLE public.backup_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type text NOT NULL DEFAULT 'database' CHECK (backup_type IN ('database', 'storage', 'full')),
  last_backup_at timestamptz,
  backup_size_mb numeric,
  retention_days integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
  last_restore_test_at timestamptz,
  last_restore_test_by uuid,
  last_restore_test_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.backup_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage backup status"
  ON public.backup_status FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_backup_status_updated_at
  BEFORE UPDATE ON public.backup_status
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Seed default backup entries
INSERT INTO public.backup_status (backup_type, status, retention_days) VALUES
  ('database', 'unknown', 30),
  ('storage', 'unknown', 30);

-- Disaster Recovery documents (versioned, editable by super_admin)
CREATE TABLE public.dr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL CHECK (section IN ('data_recovery', 'failover_plan', 'communication_plan', 'rto_rpo_targets')),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  edited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dr_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read DR docs"
  ON public.dr_documents FOR SELECT
  USING (has_any_admin_role(auth.uid()));

CREATE POLICY "Super admins manage DR docs"
  ON public.dr_documents FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_dr_documents_updated_at
  BEFORE UPDATE ON public.dr_documents
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- SLA targets
CREATE TABLE public.sla_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  target_value numeric NOT NULL,
  target_unit text NOT NULL DEFAULT 'percent' CHECK (target_unit IN ('percent', 'minutes', 'hours')),
  warning_threshold numeric NOT NULL,
  critical_threshold numeric NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage SLA targets"
  ON public.sla_targets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Any admin can read SLA targets"
  ON public.sla_targets FOR SELECT
  USING (has_any_admin_role(auth.uid()));

CREATE TRIGGER update_sla_targets_updated_at
  BEFORE UPDATE ON public.sla_targets
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Seed default SLA targets
INSERT INTO public.sla_targets (metric_name, display_name, target_value, target_unit, warning_threshold, critical_threshold, description) VALUES
  ('webhook_success', 'Webhook Success Rate', 99.5, 'percent', 98, 95, 'Percentage of webhooks processed successfully'),
  ('payment_processing', 'Payment Processing Time', 30, 'minutes', 45, 60, 'Maximum time from payment initiation to confirmation'),
  ('fulfillment_time', 'Fulfillment Time', 24, 'hours', 36, 48, 'Time from payment confirmation to fulfillment completion'),
  ('email_delivery', 'Email Delivery Rate', 99, 'percent', 97, 95, 'Percentage of emails delivered successfully'),
  ('system_uptime', 'System Uptime', 99.9, 'percent', 99.5, 99, 'Overall platform availability');

-- SLA monthly snapshots
CREATE TABLE public.sla_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES public.sla_targets(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  actual_value numeric NOT NULL,
  status text NOT NULL DEFAULT 'met' CHECK (status IN ('met', 'at_risk', 'breached')),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage SLA snapshots"
  ON public.sla_snapshots FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Any admin can read SLA snapshots"
  ON public.sla_snapshots FOR SELECT
  USING (has_any_admin_role(auth.uid()));
