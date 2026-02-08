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
const NOWPAYMENTS_API_KEY = Deno.env.get("NOWPAYMENTS_API_KEY")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function bad(status: number, msg: string, devError?: string) {
  if (devError) console.error("Technical error:", devError);
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return bad(405, "Use POST");

    // ── Auth ──────────────────────────────────────────────
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return bad(401, "Missing auth token");

    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser(token);
    if (userErr || !user) return bad(401, "Invalid user");

    const { plan_id, referral_code } = await req.json().catch(() => ({}));
    if (!plan_id) return bad(400, "plan_id is required");

    // ── Plan ─────────────────────────────────────────────
    const { data: plan, error: planErr } = await sb
      .from("plans")
      .select("id, name, duration, price, currency, period")
      .eq("id", plan_id)
      .eq("active", true)
      .maybeSingle();
    if (planErr || !plan) return bad(404, "Plan not found or inactive");
    console.log("Plan:", JSON.stringify(plan));

    // ── Profile ──────────────────────────────────────────
    const { data: profile, error: profErr } = await sb
      .from("profiles")
      .select("id, email, full_name, used_referral_code")
      .eq("id", user.id)
      .maybeSingle();
    if (profErr || !profile)
      return bad(400, "Account not found. Please contact support.");

    // ── Referral code ────────────────────────────────────
    let referralCodeId: string | null = null;
    let finalPrice = Number(plan.price);
    let discountCents = 0;
    const codeToUse = referral_code || profile.used_referral_code;

    if (codeToUse) {
      const { data: codeData } = await sb
        .from("referral_codes")
        .select(
          "id, active, expires_at, max_uses, discount_amount_cents, discount_type"
        )
        .eq("code", codeToUse.toUpperCase())
        .maybeSingle();

      if (codeData && codeData.active) {
        const notExpired =
          !codeData.expires_at ||
          new Date(codeData.expires_at) > new Date();

        if (notExpired) {
          const { count } = await sb
            .from("referral_uses")
            .select("*", { count: "exact", head: true })
            .eq("code_id", codeData.id);

          const underLimit =
            !codeData.max_uses ||
            (count !== null && count < codeData.max_uses);

          if (underLimit) {
            referralCodeId = codeData.id;

            // Discount on annual plans
            if (
              plan.period.toLowerCase().includes("annual") &&
              (codeData.discount_type === "discount" ||
                codeData.discount_type === "both")
            ) {
              discountCents = codeData.discount_amount_cents ?? 0;
              finalPrice = Math.max(0, finalPrice - discountCents / 100);
              console.log(
                `Referral discount applied: -$${(discountCents / 100).toFixed(2)}, final: $${finalPrice}`
              );
            }

            // Clear stored code after first use
            if (profile.used_referral_code) {
              await sb
                .from("profiles")
                .update({ used_referral_code: null })
                .eq("id", user.id);
            }
          }
        }
      }
    }

    const amountCents = Math.round(finalPrice * 100);

    // ── Create order ─────────────────────────────────────
    const { data: order, error: orderErr } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        plan_name: plan.name,
        amount_cents: amountCents,
        currency: plan.currency ?? "USD",
        status: "awaiting_verification",
        referral_code_id: referralCodeId,
        discount_cents: discountCents,
      })
      .select("*")
      .single();

    if (orderErr)
      return bad(500, "Failed to create order.", orderErr.message);
    console.log("Order created:", order.id);

    // ── Create payment record ────────────────────────────
    const { data: payment, error: payErr } = await sb
      .from("payments")
      .insert({
        order_id: order.id,
        user_id: user.id,
        amount_cents: amountCents,
        currency: plan.currency ?? "USD",
        payment_method: "crypto",
        processor: "nowpayments",
        status: "pending",
      })
      .select("*")
      .single();

    if (payErr)
      return bad(500, "Failed to create payment record.", payErr.message);

    // ── Create invoice ───────────────────────────────────
    let invoiceNumber: string | null = null;
    const { data: invoice, error: invErr } = await sb
      .from("invoices")
      .insert({
        order_id: order.id,
        user_id: user.id,
        amount_cents: amountCents,
        currency: plan.currency ?? "USD",
        status: "issued",
        invoice_number: "",
      })
      .select("*")
      .single();

    if (invErr) {
      console.error("Invoice creation failed:", invErr.message);
    } else {
      invoiceNumber = invoice.invoice_number;
      console.log("Invoice created:", invoiceNumber);
    }

    // ── Create pending subscription ──────────────────────
    const { error: subErr } = await sb.from("subscriptions").insert({
      user_id: user.id,
      plan_id: plan.id,
      plan: plan.name,
      amount_cents: amountCents,
      currency: plan.currency ?? "USD",
      status: "pending",
      processor: "nowpayments",
      referral_code_id: referralCodeId,
      provisioning_status: "pending_provision",
    });
    if (subErr) console.error("Subscription creation failed:", subErr.message);

    // ── Call NOWPayments to create crypto invoice ────────
    let paymentUrl: string | null = null;
    try {
      const origin =
        req.headers.get("origin") ||
        "https://reel-flix-launchpad.lovable.app";

      const npRes = await fetch("https://api.nowpayments.io/v1/invoice", {
        method: "POST",
        headers: {
          "x-api-key": NOWPAYMENTS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price_amount: finalPrice,
          price_currency: (plan.currency ?? "USD").toLowerCase(),
          order_id: order.id,
          order_description: `${plan.name} – ${plan.duration}`,
          ipn_callback_url: `${SUPABASE_URL}/functions/v1/nowpayments-webhook`,
          success_url: `${origin}/dashboard/transactions`,
          cancel_url: `${origin}/dashboard/subscriptions`,
        }),
      });

      const npData = await npRes.json();
      console.log("NOWPayments response:", JSON.stringify(npData));

      if (npData.invoice_url) {
        paymentUrl = npData.invoice_url;

        await sb
          .from("payments")
          .update({
            processor_payment_id: String(npData.id),
            processor_data: npData,
          })
          .eq("id", payment.id);
      } else {
        console.error("NOWPayments did not return invoice_url:", npData);
      }
    } catch (npError) {
      console.error("NOWPayments API error:", npError);
    }

    // ── Response ─────────────────────────────────────────
    return new Response(
      JSON.stringify({
        ok: true,
        order_id: order.id,
        payment_id: payment.id,
        invoice_number: invoiceNumber,
        pay_url: paymentUrl,
      }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e) {
    console.error("❌ Edge function error:", e);
    return bad(
      500,
      "An error occurred while processing your subscription. Please try again.",
      (e as Error).message
    );
  }
});
