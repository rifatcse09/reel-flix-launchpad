// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PlanRow = {
  id: number;
  name: string;
  duration: number; // days
  price: number; // amount in USD/EUR, or use amount_cents if you prefer
  currency: string; // 'USD'
  whmcs_pid: number; // product id in WHMCS
  period: string; // billing cycle: monthly, annually, etc.
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHMCS_URL = Deno.env.get("WHMCS_URL")!;
const WHMCS_API_IDENTIFIER = Deno.env.get("WHMCS_API_IDENTIFIER")!;
const WHMCS_API_SECRET = Deno.env.get("WHMCS_API_SECRET")!;
const WHMCS_PAYMENT_METHOD = Deno.env.get("WHMCS_PAYMENT_METHOD") ?? "stripe";
const WHMCS_PAYMENT_SECRET = Deno.env.get("WHMCS_PAYMENT_SECRET")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function mapBillingCycle(period: string): string {
  const periodLower = period.toLowerCase();
  switch (periodLower) {
    case "monthly":
      return "Monthly";
    case "annual":
    case "yearly":
      return "Annually";
    case "semi-annually":
    case "semiannually":
    case "6-months":
      return "Semi-Annually";
    default:
      return period; // fallback to original value
  }
}

function buildWhmcsCustomvars(vars: Record<string, string>): string {
  const entries = Object.entries(vars);

  let inner = "";
  for (const [key, value] of entries) {
    const keyLen = key.length;      // OK for ASCII
    const valLen = value.length;    // OK for URL (ASCII)
    inner += `s:${keyLen}:"${key}";s:${valLen}:"${value}";`;
  }

  const serialized = `a:${entries.length}:{${inner}}`;

  // base64 encode (Deno has btoa)
  const base64 = btoa(serialized);
  return base64;
}

function bad(status: number, msg: string) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

async function callWhmcs(action: string, payload: Record<string, any>) {
  const body = new URLSearchParams({
    action,
    identifier: WHMCS_API_IDENTIFIER,
    secret: WHMCS_API_SECRET,
    accesskey: Deno.env.get("WHMCS_API_ACCESS_KEY") ?? "",
    responsetype: "json",
    ...Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)])),
  });

  const res = await fetch(`${WHMCS_URL}/includes/api.php`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await res.json();
  if (json.result !== "success") {
    throw new Error(`WHMCS ${action} failed: ${JSON.stringify(json)}`);
  }
  return json;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return bad(405, "Use POST");

    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return bad(401, "Missing auth token");

    // get the current user
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser(token);
    if (userErr || !user) return bad(401, "Invalid user");

    const { plan_id, referral_code, promo_code } = await req.json().catch(() => ({}));
    if (!plan_id) return bad(400, "plan_id is required");

    // pull plan
    const { data: plan, error: planErr } = await sb
      .from("plans")
      .select("id, name, duration, price, currency, whmcs_pid, period")
      .eq("id", plan_id)
      .eq("active", true)
      .maybeSingle<PlanRow>();
    if (planErr || !plan) return bad(404, "Plan not found or inactive");

    console.log("Plan data:", JSON.stringify(plan));

    // get profile & whmcs client id
    const { data: profile, error: profErr } = await sb
      .from("profiles")
      .select("id, email, full_name, whmcs_client_id, phone, country, state, address, used_referral_code")
      .eq("id", user.id)
      .maybeSingle();
    if (profErr || !profile) return bad(400, "Profile missing");

    // Helper to normalize phone for WHMCS
    function normalizePhone(input: string | null | undefined): string {
      if (!input) return "0000000000";
      return input.replace(/\D/g, "") || "0000000000";
    }

    // Helper to normalize postcode based on country
    function normalizePostcode(country: string | null | undefined): string {
      const c = (country || "").toUpperCase();
      switch (c) {
        case "US":
          return "00000";
        case "CA":
          return "A1A 1A1";
        case "GB":
        case "UK":
          return "SW1A 1AA";
        case "AU":
          return "0000";
        default:
          return "00000";
      }
    }

    // Ensure client exists in WHMCS (create if missing)
    let whmcsClientId = profile.whmcs_client_id;
    
    // Check for unpaid invoices if client exists
    if (whmcsClientId) {
      try {
        const invoices = await callWhmcs("GetInvoices", {
          userid: whmcsClientId,
          status: "Unpaid",
        });
        
        if (invoices.invoices && invoices.invoices.invoice && invoices.invoices.invoice.length > 0) {
          const unpaidInvoices = Array.isArray(invoices.invoices.invoice) 
            ? invoices.invoices.invoice 
            : [invoices.invoices.invoice];
          
          const invoiceIds = unpaidInvoices.map((inv: any) => inv.id || inv.invoiceid).join(", ");
          console.log(`Client has ${unpaidInvoices.length} unpaid invoice(s): ${invoiceIds}`);
          
          return bad(400, `You have ${unpaidInvoices.length} unpaid invoice(s) (IDs: ${invoiceIds}). Please delete or pay ALL existing invoices in WHMCS before creating a new subscription.`);
        }
      } catch (invoiceErr) {
        console.error("Failed to check unpaid invoices:", invoiceErr);
        // Continue anyway - don't block if invoice check fails
      }
    }
    
    if (!whmcsClientId) {
      const created = await callWhmcs("AddClient", {
        firstname: (profile.full_name || "").split(" ")[0] || "User",
        lastname: (profile.full_name || "").split(" ").slice(1).join(" ") || "Unknown",
        email: profile.email,
        country: (profile.country || "US").toUpperCase(),
        address1: profile.address || "N/A",
        city: (profile.state || "N/A").toUpperCase(),
        state: (profile.country || "US").toUpperCase(),
        postcode: normalizePostcode(profile.country),
        phonenumber: normalizePhone(profile.phone),
        password2: crypto.randomUUID(),
      });
      whmcsClientId = created.clientid;

      // persist client id back to profile
      await sb
        .from("profiles")
        .update({ whmcs_client_id: String(whmcsClientId) })
        .eq("id", user.id);
    }

    // Validate and process referral code if provided (or use stored code from signup)
    let referralCodeId: string | null = null;
    let whmcsAffiliateId: number | null = null;
    let finalPrice = Number(plan.price);
    let discountApplied = false;
    
    // Use provided referral code, or fallback to the one stored at signup
    const codeToUse = referral_code || profile.used_referral_code;
    
    if (codeToUse) {
      const { data: codeData, error: codeErr } = await sb
        .from("referral_codes")
        .select("id, active, expires_at, max_uses, discount_amount_cents, discount_type, whmcs_affiliate_id")
        .eq("code", codeToUse.toUpperCase())
        .maybeSingle();

      if (codeData && codeData.active) {
        // Check if code is expired
        if (!codeData.expires_at || new Date(codeData.expires_at) > new Date()) {
          // Check max uses
          const { count } = await sb
            .from("referral_uses")
            .select("*", { count: "exact", head: true })
            .eq("code_id", codeData.id);

          if (!codeData.max_uses || (count !== null && count < codeData.max_uses)) {
            referralCodeId = codeData.id;
            
            // Store WHMCS affiliate ID for later use
            if (codeData.whmcs_affiliate_id) {
              whmcsAffiliateId = codeData.whmcs_affiliate_id;
              console.log(`WHMCS Affiliate ID ${whmcsAffiliateId} will be associated with this order`);
            }
            
            // Apply discount if applicable for annual plans
            if (
              plan.period.toLowerCase().includes("annual") &&
              (codeData.discount_type === "discount" || codeData.discount_type === "both")
            ) {
              finalPrice = Math.max(0, finalPrice - (codeData.discount_amount_cents / 100));
              discountApplied = true;
              console.log(`Referral code ${codeToUse} applied - discount: $${codeData.discount_amount_cents / 100}, final price: $${finalPrice}`);
            }
            
            // Clear the used_referral_code from profile after first subscription purchase
            if (profile.used_referral_code) {
              await sb
                .from("profiles")
                .update({ used_referral_code: null })
                .eq("id", user.id);
              console.log("Cleared used_referral_code from profile after applying to first subscription");
            }
          }
        }
      }
    }

    // create pending subscription
    const { data: sub, error: subErr } = await sb
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        plan: plan.name,
        amount_cents: Math.round(finalPrice * 100),
        currency: plan.currency ?? "USD",
        status: "pending",
        processor: "whmcs",
        processor_client_id: String(whmcsClientId),
        referral_code_id: referralCodeId,
      })
      .select("*")
      .single();

    if (subErr) return bad(500, `DB insert failed: ${subErr.message}`);

    // Create WHMCS order with price override for referral discount
    const mappedCycle = mapBillingCycle(plan.period);
    console.log(`Creating WHMCS order - PID: ${plan.whmcs_pid}, Billing Cycle: ${mappedCycle} (from ${plan.period}), Final Price: $${finalPrice}`);

    const orderParams: Record<string, any> = {
      clientid: whmcsClientId,
      pid: plan.whmcs_pid,
      billingcycle: mappedCycle,
      paymentmethod: WHMCS_PAYMENT_METHOD,
      noemail: true,
      noinvoiceemail: true,
    };

    // Apply direct price override if referral discount was applied
    if (discountApplied) {
      orderParams.priceoverride = finalPrice.toFixed(2);
      const discountAmount = (plan.price - finalPrice).toFixed(2);
      orderParams.notes = `Referral Discount Applied:\nOriginal Price: $${plan.price}\nDiscount: -$${discountAmount}\nFinal Price: $${finalPrice.toFixed(2)}\nReferral Code: ${codeToUse}`;
      console.log(`WHMCS price override applied: $${finalPrice.toFixed(2)} (original: $${plan.price})`);
    }

    // Apply manual WHMCS promo code if provided
    if (promo_code) {
      orderParams.promocode = promo_code.toUpperCase();
      console.log(`WHMCS promo code applied: ${promo_code}`);
    }

    // Apply WHMCS affiliate ID if referral code had one
    if (whmcsAffiliateId) {
      orderParams.affid = whmcsAffiliateId;
      console.log(`WHMCS affiliate ID applied: ${whmcsAffiliateId}`);
    }

    const order = await callWhmcs("AddOrder", orderParams);

    console.log("WHMCS order response:", JSON.stringify(order));

    const invoiceId = order.invoiceid;
    const orderId = order.orderid;
    console.log(`Order created - Invoice ID: ${invoiceId}, Order ID: ${orderId}`);

    // Add discount as a separate line item if applied
    if (discountApplied) {
      try {
        const discountAmount = (plan.price - finalPrice).toFixed(2);
        await callWhmcs("AddInvoicePayment", {
          invoiceid: invoiceId,
          amount: discountAmount,
          gateway: "credit",
          date: new Date().toISOString().split('T')[0],
          transid: `REFCODE-${codeToUse}`,
          noemail: true
        });
        console.log(`Added discount credit of $${discountAmount} to invoice ${invoiceId}`);
      } catch (discountErr) {
        console.error("Failed to add discount credit:", discountErr);
        // Continue anyway - the price override is already applied
      }
    }

    // save processor IDs
    const { error: updateErr } = await sb
      .from("subscriptions")
      .update({
        processor_invoice_id: String(invoiceId),
        processor_order_id: String(orderId),
      })
      .eq("id", sub.id);

    if (updateErr) {
      console.error("Failed to update subscription with processor IDs:", updateErr);
      return bad(500, `Failed to update subscription: ${updateErr.message}`);
    }
    console.log("Subscription updated with processor IDs");

    // Create secure payment token using SHA256
    const normalizedUrl = WHMCS_URL.endsWith("/") ? WHMCS_URL : WHMCS_URL + "/";

    const tokenData = `${invoiceId}${normalizedUrl}${WHMCS_PAYMENT_SECRET}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(tokenData);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const paymentToken = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Create WHMCS guest payment URL with secure token
    const whmcsPaymentUrl = `${normalizedUrl}guest-pay.php?invoice=${invoiceId}&token=${paymentToken}`;
    console.log("WHMCS guest payment URL created with secure token");

    // Build customvars for WHMCS
    const customvars = buildWhmcsCustomvars({
      guest_payment_link: whmcsPaymentUrl,
    });

    // Trigger WHMCS to send invoice email with guest payment link
    try {
      await callWhmcs("SendEmail", {
        messagename: "Invoice Created",
        id: invoiceId,
        customvars,
      });
      console.log("WHMCS invoice email triggered successfully");
    } catch (emailError) {
      console.error("Failed to send WHMCS email:", emailError);
      // Continue anyway - the subscription was created
    }

    return new Response(
      JSON.stringify({
        ok: true,
        subscription_id: sub.id,
        invoice_id: invoiceId,
        pay_url: whmcsPaymentUrl,
      }),
      {
        headers: { ...corsHeaders, "content-type": "application/json" },
      },
    );
  } catch (e) {
    return bad(500, (e as Error).message);
  }
});
