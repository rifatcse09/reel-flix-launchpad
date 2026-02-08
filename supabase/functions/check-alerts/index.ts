import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const alertsToCreate: Array<{
      alert_type: string;
      severity: string;
      title: string;
      message: string;
      entity_type?: string;
      entity_id?: string;
    }> = [];

    // 1. Check webhook failures (>3 in last hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const { data: webhookFails } = await supabase
      .from('system_event_log')
      .select('id')
      .eq('status', 'fail')
      .ilike('event_type', '%webhook%')
      .gte('created_at', oneHourAgo);

    if (webhookFails && webhookFails.length > 3) {
      // Check we haven't already alerted for this
      const { data: existingAlert } = await supabase
        .from('operational_alerts')
        .select('id')
        .eq('alert_type', 'webhook_failure')
        .is('resolved_at', null)
        .gte('created_at', oneHourAgo)
        .limit(1);

      if (!existingAlert || existingAlert.length === 0) {
        alertsToCreate.push({
          alert_type: 'webhook_failure',
          severity: webhookFails.length > 10 ? 'critical' : 'warning',
          title: `${webhookFails.length} webhook failures in last hour`,
          message: `NOWPayments webhook processing has failed ${webhookFails.length} times. Check system_event_log for details.`,
        });
      }
    }

    // 2. Check stuck payments (unpaid > 30 minutes with a payment record)
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const { data: stuckPayments } = await supabase
      .from('payments')
      .select('id, invoice_id, created_at')
      .eq('status', 'pending')
      .lt('created_at', thirtyMinAgo)
      .limit(10);

    if (stuckPayments && stuckPayments.length > 0) {
      for (const payment of stuckPayments) {
        const { data: existingAlert } = await supabase
          .from('operational_alerts')
          .select('id')
          .eq('alert_type', 'payment_stuck')
          .eq('entity_id', payment.id)
          .is('resolved_at', null)
          .limit(1);

        if (!existingAlert || existingAlert.length === 0) {
          const stuckMinutes = Math.round((now.getTime() - new Date(payment.created_at).getTime()) / 60000);
          alertsToCreate.push({
            alert_type: 'payment_stuck',
            severity: stuckMinutes > 120 ? 'critical' : 'warning',
            title: `Payment stuck for ${stuckMinutes} minutes`,
            message: `Payment ${payment.id.slice(0, 8)} has been pending for ${stuckMinutes} minutes without confirmation.`,
            entity_type: 'payment',
            entity_id: payment.id,
          });
        }
      }
    }

    // 3. Check stuck fulfillment (> 6 hours)
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
    const { data: stuckFulfillment } = await supabase
      .from('fulfillment')
      .select('id, invoice_id, user_id, created_at')
      .eq('status', 'pending_manual_provisioning')
      .lt('created_at', sixHoursAgo)
      .limit(10);

    if (stuckFulfillment && stuckFulfillment.length > 0) {
      const { data: existingAlerts } = await supabase
        .from('operational_alerts')
        .select('entity_id')
        .eq('alert_type', 'fulfillment_stuck')
        .is('resolved_at', null);

      const existingIds = new Set((existingAlerts || []).map(a => a.entity_id));

      for (const item of stuckFulfillment) {
        if (!existingIds.has(item.id)) {
          const stuckHours = Math.round((now.getTime() - new Date(item.created_at).getTime()) / 3600000);
          alertsToCreate.push({
            alert_type: 'fulfillment_stuck',
            severity: stuckHours > 24 ? 'critical' : 'warning',
            title: `Fulfillment pending for ${stuckHours}h`,
            message: `Fulfillment item ${item.id.slice(0, 8)} has been waiting for manual provisioning for ${stuckHours} hours.`,
            entity_type: 'fulfillment',
            entity_id: item.id,
          });
        }
      }
    }

    // 4. Process retry queue — find items due for retry
    const { data: retryItems } = await supabase
      .from('retry_queue')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('next_retry_at', now.toISOString())
      .lt('attempts', 5) // max_attempts safety
      .limit(10);

    let retriesProcessed = 0;
    if (retryItems) {
      for (const item of retryItems) {
        if (item.attempts >= item.max_attempts) {
          // Mark as exhausted
          await supabase
            .from('retry_queue')
            .update({ status: 'exhausted' })
            .eq('id', item.id);
          continue;
        }

        // Mark as retrying
        await supabase
          .from('retry_queue')
          .update({ status: 'retrying', attempts: item.attempts + 1 })
          .eq('id', item.id);

        let success = false;
        let errorMsg = '';

        try {
          if (item.operation_type === 'email') {
            const opData = item.operation_data as { invoice_id?: string; type?: string };
            const response = await fetch(`${supabaseUrl}/functions/v1/send-invoice-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({ invoice_id: opData.invoice_id, type: opData.type }),
            });
            success = response.ok;
            if (!success) errorMsg = `HTTP ${response.status}`;
          }
        } catch (e: any) {
          errorMsg = e.message || 'Unknown error';
        }

        if (success) {
          await supabase
            .from('retry_queue')
            .update({ status: 'succeeded', resolved_at: now.toISOString() })
            .eq('id', item.id);
        } else {
          // Calculate next retry: exponential backoff
          const delays = [5 * 60, 15 * 60, 60 * 60, 4 * 60 * 60, 12 * 60 * 60];
          const delaySec = delays[Math.min(item.attempts, delays.length - 1)];
          const nextRetry = new Date(now.getTime() + delaySec * 1000).toISOString();

          await supabase
            .from('retry_queue')
            .update({
              status: item.attempts + 1 >= item.max_attempts ? 'exhausted' : 'failed',
              last_error: errorMsg,
              next_retry_at: nextRetry,
            })
            .eq('id', item.id);
        }

        retriesProcessed++;
      }
    }

    // Insert new alerts
    if (alertsToCreate.length > 0) {
      await supabase.from('operational_alerts').insert(alertsToCreate);

      // Send email alerts for critical ones
      const criticalAlerts = alertsToCreate.filter(a => a.severity === 'critical');
      if (criticalAlerts.length > 0) {
        try {
          const { Resend } = await import('npm:resend@2.0.0');
          const resendKey = Deno.env.get('RESEND_API_KEY');
          if (resendKey) {
            const resend = new Resend(resendKey);
            const alertBody = criticalAlerts
              .map(a => `⚠️ ${a.title}\n${a.message}`)
              .join('\n\n');

            await resend.emails.send({
              from: 'ReelFlix Alerts <alerts@reelflix.tv>',
              to: ['reelflix731@gmail.com'],
              subject: `🚨 ${criticalAlerts.length} Critical Alert(s) — ReelFlix`,
              html: `<h2>Critical Operational Alerts</h2><pre>${alertBody}</pre><p><a href="https://reel-flix-launchpad.lovable.app/admin/system-health">View Dashboard</a></p>`,
            });
          }
        } catch (emailErr) {
          console.error('Failed to send alert email:', emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        alerts_created: alertsToCreate.length,
        retries_processed: retriesProcessed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Check-alerts error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
