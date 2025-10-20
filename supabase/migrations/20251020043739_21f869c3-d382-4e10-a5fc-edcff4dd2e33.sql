-- Add new columns to notifications table for enhanced functionality
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS channel text DEFAULT 'in_app',
ADD COLUMN IF NOT EXISTS click_url text,
ADD COLUMN IF NOT EXISTS clicks integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recurrence_type text,
ADD COLUMN IF NOT EXISTS recurrence_interval interval,
ADD COLUMN IF NOT EXISTS template_id uuid,
ADD COLUMN IF NOT EXISTS last_sent_at timestamp with time zone;

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  title_template text NOT NULL,
  message_template text NOT NULL,
  type text NOT NULL DEFAULT 'marketing',
  channel text NOT NULL DEFAULT 'in_app',
  priority text NOT NULL DEFAULT 'normal',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on templates
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for templates
CREATE POLICY "Admins manage templates"
  ON notification_templates
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create notification clicks tracking table
CREATE TABLE IF NOT EXISTS notification_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  clicked_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable RLS on clicks
ALTER TABLE notification_clicks ENABLE ROW LEVEL SECURITY;

-- Create policies for clicks
CREATE POLICY "Admins view all clicks"
  ON notification_clicks
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users record their clicks"
  ON notification_clicks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_notification_clicks_notification_id ON notification_clicks(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_clicks_user_id ON notification_clicks(user_id);

-- Add trigger for updating notifications table
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN notifications.channel IS 'Delivery channel: in_app, email, or sms';
COMMENT ON COLUMN notifications.recurrence_type IS 'Recurrence pattern: daily, weekly, monthly';
COMMENT ON COLUMN notifications.click_url IS 'URL to track when notification is clicked';
COMMENT ON TABLE notification_templates IS 'Reusable notification templates for common messages';
COMMENT ON TABLE notification_clicks IS 'Track user clicks on notifications for analytics';