// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function logEvent(
  event_type: string,
  entity_type: string,
  entity_id: string,
  status: string,
  metadata: Record<string, unknown> = {},
  error_message?: string
) {
  try {
    await sb.from("system_event_log").insert({
      event_type,
      entity_type,
      entity_id,
      status,
      metadata,
      error_message: error_message || null,
    });
  } catch (e) {
    console.error("Failed to write system_event_log:", e);
  }
}

/**
 * NOWPayments IPN (Instant Payment Notification) webhook.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("NOWPayments IPN received:", JSON.stringify(body));

    const {
      payment_id,
      payment_status,
      order_id,
      actually_paid,
      pay_currency,
      payin_hash,
    } = body;

    // Log webhook received
    await logEvent(
      "nowpayments_webhook_received",
      "payment",
      order_id || "unknown",
      "success",
      { payment_id, payment_status, actually_paid, pay_currency }
    );

    if (!order_id) {
      console.error("Missing order_id (invoice_id) in IPN");
      await logEvent("nowpayments_webhook_received", "payment", "unknown", "fail", body, "Missing order_id in IPN");
      return new Response("OK", { status: 200 });
    }

    // Map NOWPayments status to our internal status
    let internalStatus: string;
    switch (payment_status) {
      case "waiting":
      case "confirming":
      case "partially_paid":
        internalStatus = "pending";
        break;
      case "confirmed":
      case "sending":
      case "finished":
        internalStatus = "confirmed";
        break;
      case "failed":
      case "refunded":
      case "expired":
        internalStatus = "failed";
        break;
      default:
        internalStatus = "pending";
    }

    // Update payment record linked to this invoice
    const updateData: Record<string, any> = {
      status: internalStatus,
      processor_data: body,
    };

    if (actually_paid) {
      updateData.amount_received_cents = Math.round(
        parseFloat(actually_paid) * 100
      );
    }

    if (pay_currency) {
      updateData.chain = pay_currency;
    }

    if (payin_hash) {
      updateData.tx_hash = payin_hash;
    }

    if (internalStatus === "confirmed") {
      updateData.received_at = new Date().toISOString();
    }

    const { error: updateErr } = await sb
      .from("payments")
      .update(updateData)
      .eq("invoice_id", order_id);

    if (updateErr) {
      console.error("Failed to update payment:", updateErr);
      await logEvent("payment_update_failed", "payment", order_id, "fail", { internalStatus }, updateErr.message);
    } else {
      console.log(`Payment for invoice ${order_id} updated to status: ${internalStatus}`);
    }

    // When crypto payment is confirmed by NOWPayments, add a note to the invoice
    if (internalStatus === "confirmed") {
      await sb
        .from("invoices")
        .update({
          notes: `Crypto payment confirmed by NOWPayments. TX: ${payin_hash || payment_id}. Awaiting admin verification.`,
        })
        .eq("id", order_id);

      console.log(`Invoice ${order_id}: crypto payment confirmed, awaiting admin verification`);
    }

    // If payment failed/expired, void the invoice
    if (internalStatus === "failed") {
      await sb
        .from("invoices")
        .update({ status: "void", notes: `Payment ${payment_status}` })
        .eq("id", order_id);

      console.log(`Invoice ${order_id} voided due to ${payment_status} payment`);
    }

    // Always return 200 so NOWPayments doesn't retry
    return new Response("OK", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    await logEvent("nowpayments_webhook_error", "payment", "unknown", "fail", {}, (e as Error).message);
    return new Response("OK", { status: 200 });
  }
});
