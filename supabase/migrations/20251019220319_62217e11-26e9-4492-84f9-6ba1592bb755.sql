-- Create settings table for app-wide configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  category text NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage all settings
CREATE POLICY "Admins manage app settings"
ON public.app_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read certain public settings (theme)
CREATE POLICY "Public can read theme settings"
ON public.app_settings
FOR SELECT
USING (category = 'theme');

-- Create trigger for updated_at
CREATE TRIGGER handle_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default theme settings
INSERT INTO public.app_settings (key, value, category)
VALUES 
  ('theme_primary', '"#ff1493"'::jsonb, 'theme'),
  ('theme_secondary', '"#000000"'::jsonb, 'theme'),
  ('theme_accent', '"#ffffff"'::jsonb, 'theme'),
  ('maintenance_mode', 'false'::jsonb, 'system')
ON CONFLICT (key) DO NOTHING;