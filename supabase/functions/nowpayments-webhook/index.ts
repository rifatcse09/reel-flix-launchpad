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
const NOWPAYMENTS_IPN_SECRET = Deno.env.get("NOWPAYMENTS_IPN_SECRET") ?? "";

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
 * Validates payment amount against expected price from subscription_plans.
 */
async function verifyIpnSignature(req: Request, rawBody: string): Promise<boolean> {
  if (!NOWPAYMENTS_IPN_SECRET) {
    console.warn("NOWPAYMENTS_IPN_SECRET not set — skipping signature verification");
    return true;
  }

  const receivedSig = req.headers.get("x-nowpayments-sig");
  if (!receivedSig) {
    console.error("IPN signature header missing");
    return false;
  }

  try {
    // NOWPayments signs the sorted JSON body with HMAC-SHA512
    const parsed = JSON.parse(rawBody);
    const sortedKeys = Object.keys(parsed).sort();
    const sortedObj: Record<string, unknown> = {};
    for (const key of sortedKeys) sortedObj[key] = parsed[key];
    const sortedBody = JSON.stringify(sortedObj);

    const encoder = new TextEncoder();
    const keyData = encoder.encode(NOWPAYMENTS_IPN_SECRET);
    const msgData = encoder.encode(sortedBody);

    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const computedSig = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const match = computedSig === receivedSig.toLowerCase();
    if (!match) {
      console.error(`IPN signature mismatch — received=${receivedSig} computed=${computedSig}`);
    }
    return match;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    console.log("NOWPayments IPN received:", JSON.stringify(body));

    // ── IPN Signature Verification ─────────────────────────────
    const sigValid = await verifyIpnSignature(req, rawBody);
    if (!sigValid) {
      await logEvent("nowpayments_signature_invalid", "payment", "unknown", "fail", {}, "IPN signature verification failed");
      console.error("Rejected IPN: invalid signature");
      return new Response("OK", { status: 200 }); // Always 200 to avoid retries revealing info
    }

    const {
      payment_id,
      payment_status,
      order_id,
      actually_paid,
      price_amount,      // Expected amount NOWPayments recorded
      pay_currency,
      payin_hash,
    } = body;

    // Log webhook received
    await logEvent(
      "nowpayments_webhook_received",
      "payment",
      order_id || "unknown",
      "success",
      { payment_id, payment_status, actually_paid, price_amount, pay_currency }
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

    // ── Payment amount integrity check ──────────────────────────
    // When payment is confirmed, verify amount matches what we authorized
    if (internalStatus === "confirmed" && actually_paid != null) {
      const { data: invoiceData } = await sb
        .from("invoices")
        .select("notes, amount_cents, plan_name")
        .eq("id", order_id)
        .maybeSingle();

      if (invoiceData) {
        const expectedUsd = invoiceData.amount_cents / 100;

        // Extract expected price from invoice notes (stored as "subscription_plan_id:xxx|expected_usd:yyy")
        let expectedUsdFromNotes: number | null = null;
        if (invoiceData.notes) {
          const match = invoiceData.notes.match(/expected_usd:([\d.]+)/);
          if (match) expectedUsdFromNotes = parseFloat(match[1]);
        }

        const authorizedPrice = expectedUsdFromNotes ?? expectedUsd;
        const receivedAmountUsd = parseFloat(actually_paid);

        // Allow a small tolerance (crypto conversions may differ by dust amounts)
        // For fiat-equivalent cross-check, price_amount from NOWPayments should match
        const priceAmountFromNP = price_amount != null ? parseFloat(price_amount) : null;

        if (priceAmountFromNP !== null && Math.abs(priceAmountFromNP - authorizedPrice) > 0.01) {
          // Price mismatch — flag as integrity warning, do NOT auto-activate
          const integrityRef = `INTEGRITY_${Date.now().toString(36).toUpperCase()}`;
          console.error(
            `${integrityRef}: PAYMENT INTEGRITY WARNING — invoice=${order_id} authorized=$${authorizedPrice} nowpayments_price_amount=$${priceAmountFromNP}`
          );

          await logEvent(
            "payment_integrity_warning",
            "payment",
            order_id,
            "fail",
            {
              invoice_id: order_id,
              authorized_price_usd: authorizedPrice,
              nowpayments_price_amount: priceAmountFromNP,
              actually_paid: receivedAmountUsd,
              pay_currency,
              payment_id,
              ref: integrityRef,
            },
            `Price mismatch: authorized=$${authorizedPrice} received_price_amount=$${priceAmountFromNP}`
          );

          // Update invoice with integrity flag — do NOT mark as paid
          await sb
            .from("invoices")
            .update({
              notes: `${invoiceData.notes || ""} | INTEGRITY_FLAG: price mismatch — authorized=$${authorizedPrice} np_price=$${priceAmountFromNP} (${integrityRef}). Awaiting manual admin review.`,
            })
            .eq("id", order_id);

          // Still update payment record with received details, but mark as pending for manual review
          await sb
            .from("payments")
            .update({
              status: "pending",
              processor_data: { ...body, integrity_flag: true, ref: integrityRef },
              amount_received_cents: Math.round(receivedAmountUsd * 100),
              chain: pay_currency ?? null,
              tx_hash: payin_hash ?? null,
            })
            .eq("invoice_id", order_id);

          console.log(`Invoice ${order_id} flagged for manual review due to price integrity warning.`);
          return new Response("OK", { status: 200 });
        }

        console.log(`[INTEGRITY_OK] invoice=${order_id} authorized=$${authorizedPrice} np_price_amount=$${priceAmountFromNP}`);
      }
    }

    // ── Standard status update (no integrity issues) ────────────
    const updateData: Record<string, any> = {
      status: internalStatus,
      processor_data: body,
    };

    if (actually_paid) {
      updateData.amount_received_cents = Math.round(parseFloat(actually_paid) * 100);
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

    // When confirmed, add note to invoice for admin verification
    if (internalStatus === "confirmed") {
      await sb
        .from("invoices")
        .update({
          notes: `Crypto payment confirmed by NOWPayments. TX: ${payin_hash || payment_id}. Awaiting admin verification.`,
        })
        .eq("id", order_id);

      await logEvent(
        "nowpayments_payment_confirmed",
        "payment",
        order_id,
        "success",
        { payment_id, actually_paid, pay_currency, payin_hash }
      );

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
