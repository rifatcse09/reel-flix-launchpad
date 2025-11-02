-- Create plans table with numeric ID
CREATE TABLE public.plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  period TEXT NOT NULL,
  duration TEXT NOT NULL,
  highlighted BOOLEAN NOT NULL DEFAULT false,
  whmcs_pid INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  device_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Anyone can read active plans
CREATE POLICY "Anyone can read active plans"
ON public.plans
FOR SELECT
USING (active = true);

-- Admins manage plans
CREATE POLICY "Admins manage plans"
ON public.plans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert initial plans data
INSERT INTO public.plans (id, name, description, period, duration, highlighted, display_order, device_options) VALUES
(1, 'Starter', 'Dive into a world of convenience and discovery with our Starter Subscription Package', 'monthly', '30 Days', false, 1, 
'[
  {"devices": 1, "price": 14.99},
  {"devices": 2, "price": 19.99},
  {"devices": 3, "price": 24.99}
]'::jsonb),

(2, 'Professional', 'Elevate your viewing experience with our Professional Subscription Package which is premium-streaming-supreme within a fully inclusive, top-tier quality TV experience', '6 months', '180 Days', false, 3,
'[
  {"devices": 1, "price": 54.99},
  {"devices": 2, "price": 64.99},
  {"devices": 3, "price": 74.99}
]'::jsonb),

(3, 'Elite', 'Experience excellence with our Elite Subscription Package! Renowned for its comprehensive lineup of channels and features tailored for discerning entertainment enthusiasts', 'annual', '365 Days', true, 2,
'[
  {"devices": 1, "price": 99.99},
  {"devices": 2, "price": 119.99},
  {"devices": 3, "price": 139.99}
]'::jsonb);