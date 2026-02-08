
-- Upgrade existing admin users to also have super_admin role
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'super_admin'::app_role
FROM public.user_roles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- Function to check if user has any admin-level role
CREATE OR REPLACE FUNCTION public.has_any_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin', 'support_agent', 'billing_admin', 'analyst', 'fulfillment_agent')
  )
$$;

-- Function to get user's highest-priority admin role
CREATE OR REPLACE FUNCTION public.get_admin_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role IN ('admin', 'super_admin', 'support_agent', 'billing_admin', 'analyst', 'fulfillment_agent')
  ORDER BY
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'billing_admin' THEN 3
      WHEN 'support_agent' THEN 4
      WHEN 'fulfillment_agent' THEN 5
      WHEN 'analyst' THEN 6
    END
  LIMIT 1
$$;
