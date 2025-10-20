-- Create commission tracking table
CREATE TABLE public.referrer_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00, -- percentage (e.g., 10.00 for 10%)
  total_earned_cents INTEGER NOT NULL DEFAULT 0,
  total_paid_cents INTEGER NOT NULL DEFAULT 0,
  pending_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  CONSTRAINT valid_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 100)
);

-- Create payout logs table
CREATE TABLE public.payout_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled
  payment_method TEXT, -- bank_transfer, paypal, stripe, etc.
  payment_reference TEXT, -- external transaction ID
  notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_payout_status CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.referrer_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrer_commissions
CREATE POLICY "Admins manage commissions"
  ON public.referrer_commissions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Referrers view their own commissions"
  ON public.referrer_commissions
  FOR SELECT
  USING (auth.uid() = referrer_id);

-- RLS Policies for payout_logs
CREATE POLICY "Admins manage payouts"
  ON public.payout_logs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Referrers view their own payouts"
  ON public.payout_logs
  FOR SELECT
  USING (auth.uid() = referrer_id);

-- Add updated_at trigger for referrer_commissions
CREATE TRIGGER update_referrer_commissions_updated_at
  BEFORE UPDATE ON public.referrer_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_referrer_commissions_referrer_id ON public.referrer_commissions(referrer_id);
CREATE INDEX idx_payout_logs_referrer_id ON public.payout_logs(referrer_id);
CREATE INDEX idx_payout_logs_status ON public.payout_logs(status);
CREATE INDEX idx_payout_logs_created_at ON public.payout_logs(created_at DESC);