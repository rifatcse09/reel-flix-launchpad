
-- Incidents table
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  owner_id uuid,
  created_by uuid NOT NULL,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage incidents"
  ON public.incidents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read resolved incidents"
  ON public.incidents FOR SELECT
  USING (status = 'resolved' OR has_any_admin_role(auth.uid()));

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Incident updates (timeline)
CREATE TABLE public.incident_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  message text NOT NULL,
  status_change text,
  is_public boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage incident updates"
  ON public.incident_updates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read public updates"
  ON public.incident_updates FOR SELECT
  USING (is_public = true OR has_any_admin_role(auth.uid()));

-- Incident linked events
CREATE TABLE public.incident_linked_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  linked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_linked_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage linked events"
  ON public.incident_linked_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Change records
CREATE TABLE public.change_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  expected_impact text NOT NULL DEFAULT '',
  rollback_plan text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'deployed', 'rolled_back', 'completed')),
  approved_by uuid,
  approved_at timestamptz,
  deployed_at timestamptz,
  deployed_by uuid,
  incident_id uuid REFERENCES public.incidents(id),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.change_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage change records"
  ON public.change_records FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_change_records_updated_at
  BEFORE UPDATE ON public.change_records
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
