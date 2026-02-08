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

/**
 * NOWPayments IPN (Instant Payment Notification) webhook.
 *
 * This receives payment status updates from NOWPayments and updates
 * the payment record accordingly.  Order verification is still manual
 * (admin marks as paid).
 *
 * NOWPayments statuses:
 *   waiting | confirming | confirmed | sending | partially_paid
 *   finished | failed | refunded | expired
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
      order_id,      // our order UUID
      price_amount,
      actually_paid,
      pay_currency,
    } = body;

    if (!order_id) {
      console.error("Missing order_id in IPN");
      return new Response("OK", { status: 200 });
    }

    // Map NOWPayments status to our status
    let internalStatus: string;
    switch (payment_status) {
      case "waiting":
        internalStatus = "pending";
        break;
      case "confirming":
        internalStatus = "confirming";
        break;
      case "confirmed":
      case "sending":
      case "finished":
        internalStatus = "confirmed";
        break;
      case "partially_paid":
        internalStatus = "confirming";
        break;
      case "failed":
        internalStatus = "failed";
        break;
      case "refunded":
        internalStatus = "failed";
        break;
      case "expired":
        internalStatus = "expired";
        break;
      default:
        internalStatus = "pending";
    }

    // Update payment record
    const updateData: Record<string, any> = {
      status: internalStatus,
      processor_data: body,
    };

    if (internalStatus === "confirmed") {
      updateData.paid_at = new Date().toISOString();
    }

    const { error: updateErr } = await sb
      .from("payments")
      .update(updateData)
      .eq("order_id", order_id)
      .eq("processor", "nowpayments");

    if (updateErr) {
      console.error("Failed to update payment:", updateErr);
    } else {
      console.log(
        `Payment for order ${order_id} updated to status: ${internalStatus}`
      );
    }

    // When payment is confirmed, update order status so admin can verify
    // and also update the invoice
    if (internalStatus === "confirmed") {
      // Update order to show payment confirmed (admin still needs to verify)
      const { error: orderErr } = await sb
        .from("orders")
        .update({ status: "awaiting_verification", notes: `Crypto payment confirmed. TX: ${payment_id}` })
        .eq("id", order_id);
      if (orderErr) console.error("Failed to update order:", orderErr);

      console.log(`Order ${order_id} marked as awaiting_verification after confirmed crypto payment`);
    }

    // If payment failed/expired, update order status too
    if (internalStatus === "failed" || internalStatus === "expired") {
      await sb
        .from("orders")
        .update({ status: "cancelled", notes: `Payment ${internalStatus}` })
        .eq("id", order_id);
      console.log(`Order ${order_id} cancelled due to ${internalStatus} payment`);
    }

    // Always return 200 so NOWPayments doesn't retry
    return new Response("OK", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("OK", { status: 200 });
  }
});
