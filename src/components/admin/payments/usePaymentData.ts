import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Transaction } from "./PaymentTransactionsTable";

interface PaymentStats {
  totalRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
}

export const usePaymentData = (isAdmin: boolean) => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [animatedRevenue, setAnimatedRevenue] = useState(0);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [webhookStatus, setWebhookStatus] = useState<'connected' | 'disconnected'>('connected');
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
  });

  const loadTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`*, profiles!subscriptions_user_id_fkey (email)`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transactionsWithEmails: Transaction[] = (data || []).map((sub: any) => ({
        ...sub,
        user_email: sub.profiles?.email || 'No email',
        payment_method: 'card',
      }));

      setTransactions(transactionsWithEmails);
      setLastSync(new Date());

      const successful = transactionsWithEmails.filter(t => t.status === 'active');
      const failed = transactionsWithEmails.filter(t => t.status === 'cancelled');
      const pending = transactionsWithEmails.filter(t => t.status === 'pending');
      const revenue = successful.reduce((sum, t) => sum + t.amount_cents, 0) / 100;

      setStats({
        totalRevenue: revenue,
        successfulPayments: successful.length,
        failedPayments: failed.length,
        pendingPayments: pending.length,
      });

      // Animate revenue counter
      const duration = 1500;
      const steps = 60;
      const increment = revenue / steps;
      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        setAnimatedRevenue(Math.min(increment * currentStep, revenue));
        if (currentStep >= steps) {
          clearInterval(timer);
          setAnimatedRevenue(revenue);
        }
      }, duration / steps);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const checkWebhookStatus = useCallback(async () => {
    try {
      const { data: anyEvent, error: anyError } = await supabase
        .from('system_event_log')
        .select('id')
        .eq('event_type', 'nowpayments_webhook_received')
        .limit(1);

      if (anyError) throw anyError;

      if (!anyEvent || anyEvent.length === 0) {
        setWebhookStatus('connected');
        return;
      }

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('system_event_log')
        .select('id')
        .eq('event_type', 'nowpayments_webhook_received')
        .gte('created_at', oneDayAgo)
        .limit(1);

      if (error) throw error;
      setWebhookStatus(data && data.length > 0 ? 'connected' : 'disconnected');
    } catch (e) {
      console.error('Error checking webhook status:', e);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadTransactions();
      checkWebhookStatus();
    }
  }, [isAdmin, loadTransactions, checkWebhookStatus]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(() => {
      loadTransactions();
      setLastSync(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, [isAdmin, loadTransactions]);

  const getTimeSinceSync = () => {
    const diffMs = Date.now() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1m ago';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return diffHours === 1 ? '1h ago' : `${diffHours}h ago`;
  };

  return {
    transactions,
    loading,
    stats,
    animatedRevenue,
    webhookStatus,
    lastSync,
    getTimeSinceSync,
    loadTransactions,
  };
};
