
-- Create subscription_plans table as the centralized pricing configuration
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name text NOT NULL,
  device_count integer NOT NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'six_month', 'yearly', 'lifetime')),
  price_usd numeric NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(plan_name, device_count, billing_cycle)
);

-- RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can read active plans
CREATE POLICY "Anyone can read active subscription plans"
  ON public.subscription_plans
  FOR SELECT
  USING (active = true);

-- Only admins can manage plans
CREATE POLICY "Admins manage subscription plans"
  ON public.subscription_plans
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert MONTHLY plans
INSERT INTO public.subscription_plans (plan_name, device_count, billing_cycle, price_usd) VALUES
  ('Basic', 1, 'monthly', 25.00),
  ('Basic', 2, 'monthly', 30.00),
  ('Basic', 3, 'monthly', 35.00),
  ('Basic', 4, 'monthly', 40.00),
  ('Basic', 5, 'monthly', 45.00);

-- Insert SIX MONTH plans
INSERT INTO public.subscription_plans (plan_name, device_count, billing_cycle, price_usd) VALUES
  ('Platinum Plan', 1, 'six_month', 100.00),
  ('Platinum Plan', 2, 'six_month', 120.00),
  ('Platinum Plan', 3, 'six_month', 140.00),
  ('Platinum Plan', 4, 'six_month', 160.00),
  ('Platinum Plan', 5, 'six_month', 200.00);

-- Insert YEARLY plans
INSERT INTO public.subscription_plans (plan_name, device_count, billing_cycle, price_usd) VALUES
  ('Family Plan', 1, 'yearly', 160.00),
  ('Family Plan', 2, 'yearly', 180.00),
  ('Family Plan', 3, 'yearly', 200.00),
  ('Family Plan', 4, 'yearly', 220.00),
  ('Family Plan', 5, 'yearly', 240.00);

-- Insert LIFETIME plan
INSERT INTO public.subscription_plans (plan_name, device_count, billing_cycle, price_usd) VALUES
  ('Unlimited', 6, 'lifetime', 500.00);
