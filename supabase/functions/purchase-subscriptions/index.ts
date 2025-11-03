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
const WHMCS_PAYMENT_METHOD = Deno.env.get("WHMCS_PAYMENT_METHOD") ?? "banktransfer";

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

    const { plan_id } = await req.json().catch(() => ({}));
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
      .select("id, email, full_name, whmcs_client_id, phone, country, state, address")
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

    // create pending subscription
    const { data: sub, error: subErr } = await sb
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        plan: plan.name,
        amount_cents: Math.round(Number(plan.price) * 100),
        currency: plan.currency ?? "USD",
        status: "pending",
        processor: "whmcs",
        processor_client_id: String(whmcsClientId),
      })
      .select("*")
      .single();

    if (subErr) return bad(500, `DB insert failed: ${subErr.message}`);

    // Create WHMCS order (unpaid invoice)
    const mappedCycle = mapBillingCycle(plan.period);
    console.log(`Creating WHMCS order - PID: ${plan.whmcs_pid}, Billing Cycle: ${mappedCycle} (from ${plan.period})`);

    const order = await callWhmcs("AddOrder", {
      clientid: whmcsClientId,
      pid: plan.whmcs_pid,
      billingcycle: mappedCycle,
      paymentmethod: WHMCS_PAYMENT_METHOD,
      noemail: true,
    });

    console.log("WHMCS order response:", JSON.stringify(order));

    const invoiceId = order.invoiceid;
    const orderId = order.orderid;
    console.log(`Order created - Invoice ID: ${invoiceId}, Order ID: ${orderId}`);

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

    // Send invoice via WHMCS email (includes secure payment link automatically)
    console.log("Sending invoice email with secure payment link...");
    try {
      await callWhmcs("SendEmail", {
        messagename: "Invoice Payment Reminder",
        id: invoiceId
      });
      console.log("Invoice email sent successfully - user will receive secure payment link via email");
    } catch (emailErr) {
      console.error("Failed to send invoice email:", emailErr);
    }
    
    // Get invoice details
    const inv = await callWhmcs("GetInvoice", { invoiceid: invoiceId });
    console.log("Invoice status:", inv?.status, "Total:", inv?.total);
    
    // Return basic invoice URL (user should use the secure link from email for best experience)
    const payUrl = `${WHMCS_URL}/viewinvoice.php?id=${invoiceId}`;
    console.log("Fallback invoice URL:", payUrl);
    console.log("Note: User will receive secure payment link via email");

    return new Response(JSON.stringify({ ok: true, subscription_id: sub.id, invoice_id: invoiceId, pay_url: payUrl }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return bad(500, (e as Error).message);
  }
});
