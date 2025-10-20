-- Add email notification preferences columns
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS email_subscription_updates boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS email_payment_receipts boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS email_promotional_offers boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS email_feature_announcements boolean NOT NULL DEFAULT true;