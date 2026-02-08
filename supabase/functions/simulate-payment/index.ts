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

function bad(status: number, msg: string) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

async function logEvent(
  event_type: string,
  entity_type: string,
  entity_id: string,
  status: string,
  metadata: Record<string, unknown> = {},
  error_message?: string,
  actor_id?: string
) {
  try {
    await sb.from("system_event_log").insert({
      event_type,
      entity_type,
      entity_id,
      status,
      metadata,
      error_message: error_message || null,
      actor_id: actor_id || null,
    });
  } catch (e) {
    console.error("Failed to write system_event_log:", e);
  }
}

/**
 * Admin-only: Simulate a confirmed payment for testing.
 * Runs the same internal logic as a real payment confirmation:
 * 1) Creates/updates payment record to "confirmed"
 * 2) Marks invoice as "paid" (triggers auto-fulfillment via DB trigger)
 * 3) Logs all events to system_event_log
 * 4) Optionally sends test email to admin
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return bad(405, "Use POST");

    // ── Auth + Admin check ────────────────────────────────
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return bad(401, "Missing auth token");

    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser(token);
    if (userErr || !user) return bad(401, "Invalid user");

    // Verify admin role
    const { data: roleData } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) return bad(403, "Admin access required");

    const { invoice_id, send_test_email } = await req.json().catch(() => ({}));
    if (!invoice_id) return bad(400, "invoice_id is required");

    // ── Fetch invoice ────────────────────────────────────
    const { data: invoice, error: invErr } = await sb
      .from("invoices")
      .select("id, invoice_number, user_id, amount_cents, currency, status, plan_name, subscription_id")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) return bad(404, "Invoice not found");

    if (invoice.status !== "unpaid") {
      return bad(400, `Invoice is already "${invoice.status}". Can only simulate on unpaid invoices.`);
    }

    const now = new Date().toISOString();

    // ── Step 1: Create/update payment record ─────────────
    const { data: existingPayment } = await sb
      .from("payments")
      .select("id")
      .eq("invoice_id", invoice_id)
      .maybeSingle();

    let paymentId: string;

    if (existingPayment) {
      const { error: payUpErr } = await sb
        .from("payments")
        .update({
          status: "confirmed",
          amount_received_cents: invoice.amount_cents,
          received_at: now,
          tx_hash: `TEST_SIM_${Date.now()}`,
          chain: "TEST",
          processor_data: { simulated: true, admin_id: user.id, simulated_at: now },
        })
        .eq("id", existingPayment.id);

      if (payUpErr) {
        console.error("Payment update error:", payUpErr);
        return bad(500, "Failed to update payment record");
      }
      paymentId = existingPayment.id;
    } else {
      const { data: newPay, error: payInsErr } = await sb
        .from("payments")
        .insert({
          invoice_id: invoice_id,
          user_id: invoice.user_id,
          method: "test_simulation",
          provider: "test_mode",
          amount_received_cents: invoice.amount_cents,
          currency: invoice.currency,
          status: "confirmed",
          received_at: now,
          tx_hash: `TEST_SIM_${Date.now()}`,
          chain: "TEST",
          processor_data: { simulated: true, admin_id: user.id, simulated_at: now },
        })
        .select("id")
        .single();

      if (payInsErr) {
        console.error("Payment insert error:", payInsErr);
        return bad(500, "Failed to create payment record");
      }
      paymentId = newPay!.id;
    }

    // ── Step 2: Mark invoice as paid ─────────────────────
    // This triggers: trg_auto_fulfillment_on_invoice_paid (auto-creates fulfillment)
    // This triggers: trg_log_invoice_status_change (logs to system_event_log)
    const { error: invUpErr } = await sb
      .from("invoices")
      .update({
        status: "paid",
        paid_at: now,
        notes: `[TEST MODE] Simulated payment by admin at ${now}`,
      })
      .eq("id", invoice_id);

    if (invUpErr) {
      console.error("Invoice update error:", invUpErr);
      return bad(500, `Failed to mark invoice as paid: ${invUpErr.message}`);
    }

    // ── Step 3: Log simulation event ─────────────────────
    await logEvent(
      "test_payment_simulated",
      "invoice",
      invoice_id,
      "success",
      {
        invoice_number: invoice.invoice_number,
        amount_cents: invoice.amount_cents,
        payment_id: paymentId,
        subscription_id: invoice.subscription_id,
        plan_name: invoice.plan_name,
      },
      undefined,
      user.id
    );

    // ── Step 4: Send test email (to admin only) ──────────
    if (send_test_email) {
      try {
        // Get admin's email to send test email to themselves
        const { data: adminProfile } = await sb
          .from("profiles")
          .select("email")
          .eq("id", user.id)
          .single();

        if (adminProfile?.email) {
          await fetch(`${SUPABASE_URL}/functions/v1/send-invoice-email`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              invoice_id: invoice_id,
              type: "payment_confirmed",
            }),
          });

          await logEvent(
            "test_email_sent",
            "invoice",
            invoice_id,
            "success",
            { type: "payment_confirmed", admin_email: adminProfile.email },
            undefined,
            user.id
          );
        }
      } catch (emailErr) {
        console.error("Test email failed:", emailErr);
        await logEvent(
          "test_email_failed",
          "invoice",
          invoice_id,
          "fail",
          {},
          (emailErr as Error).message,
          user.id
        );
      }
    }

    // ── Verify fulfillment was created ───────────────────
    const { data: fulfillment } = await sb
      .from("fulfillment")
      .select("id, status")
      .eq("invoice_id", invoice_id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Payment simulated successfully",
        invoice_id: invoice_id,
        invoice_number: invoice.invoice_number,
        payment_id: paymentId,
        fulfillment_created: !!fulfillment,
        fulfillment_status: fulfillment?.status || null,
      }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e) {
    console.error("Simulate payment error:", e);
    return bad(500, "Simulation failed: " + (e as Error).message);
  }
});
