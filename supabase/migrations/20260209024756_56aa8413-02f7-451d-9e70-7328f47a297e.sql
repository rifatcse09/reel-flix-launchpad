
-- Defense-in-depth: Add RESTRICTIVE policies to block anonymous access on sensitive tables.
-- These act as a safety net on top of existing permissive policies that already check auth.uid().

-- Profiles (PII: email, phone, address, birthday)
CREATE POLICY "Require authentication for profiles"
  ON public.profiles AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Invoices (financial records)
CREATE POLICY "Require authentication for invoices"
  ON public.invoices AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Payments (transaction details, wallet addresses)
CREATE POLICY "Require authentication for payments"
  ON public.payments AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Subscriptions (plan and billing data)
CREATE POLICY "Require authentication for subscriptions"
  ON public.subscriptions AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fulfillment (order processing)
CREATE POLICY "Require authentication for fulfillment"
  ON public.fulfillment AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Account credits (financial balances)
CREATE POLICY "Require authentication for account_credits"
  ON public.account_credits AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admin notes (internal records)
CREATE POLICY "Require authentication for admin_notes"
  ON public.admin_notes AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Staff activity log (audit trail)
CREATE POLICY "Require authentication for staff_activity_log"
  ON public.staff_activity_log AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- System event log (system audit)
CREATE POLICY "Require authentication for system_event_log"
  ON public.system_event_log AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fraud markers (investigation data)
CREATE POLICY "Require authentication for fraud_markers"
  ON public.fraud_markers AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trial IP usage (anti-fraud)
CREATE POLICY "Require authentication for trial_ip_usage"
  ON public.trial_ip_usage AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Legal acceptances (user metadata)
CREATE POLICY "Require authentication for legal_acceptances"
  ON public.legal_acceptances AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Notification preferences (user preferences)
CREATE POLICY "Require authentication for notification_preferences"
  ON public.notification_preferences AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Referrer commissions (partner financials)
CREATE POLICY "Require authentication for referrer_commissions"
  ON public.referrer_commissions AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Payout logs (partner payouts)
CREATE POLICY "Require authentication for payout_logs"
  ON public.payout_logs AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
