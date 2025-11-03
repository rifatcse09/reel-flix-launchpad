// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WHMCS_URL = Deno.env.get("WHMCS_URL")!;
const WHMCS_API_IDENTIFIER = Deno.env.get("WHMCS_API_IDENTIFIER")!;
const WHMCS_API_SECRET = Deno.env.get("WHMCS_API_SECRET")!;
const WHMCS_API_ACCESS_KEY = Deno.env.get("WHMCS_API_ACCESS_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const APP_URL = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '') || "";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

async function callWhmcs(action: string, payload: Record<string, any>) {
  const body = new URLSearchParams({
    action,
    identifier: WHMCS_API_IDENTIFIER,
    secret: WHMCS_API_SECRET,
    accesskey: WHMCS_API_ACCESS_KEY,
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const { invoice_id, token } = await req.json();

    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "Missing invoice ID" }), { 
        status: 400, 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      });
    }

    // Verify token format (basic validation)
    if (token) {
      try {
        const decoded = atob(token);
        const [tokenInvoiceId, userId, timestamp] = decoded.split(':');
        
        if (tokenInvoiceId !== invoice_id) {
          return new Response(JSON.stringify({ error: "Invalid payment token" }), { 
            status: 403, 
            headers: { ...corsHeaders, "content-type": "application/json" } 
          });
        }
        
        console.log("Payment token verified for user:", userId);
      } catch (e) {
        console.error("Invalid token format:", e);
      }
    }

    // Fetch invoice details from WHMCS
    const invoice = await callWhmcs("GetInvoice", { invoiceid: invoice_id });
    
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: invoice.items.item.map((item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.description,
          },
          unit_amount: Math.round(parseFloat(item.amount) * 100),
        },
        quantity: 1,
      })),
      mode: 'payment',
      success_url: `${APP_URL}/payment?invoice=${invoice_id}&success=true`,
      cancel_url: `${APP_URL}/payment?invoice=${invoice_id}`,
      metadata: {
        invoice_id: invoice_id,
        whmcs_userid: invoice.userid,
      },
    });

    return new Response(JSON.stringify({ 
      invoice: invoice,
      checkout_url: session.url 
    }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.error("Payment page error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
