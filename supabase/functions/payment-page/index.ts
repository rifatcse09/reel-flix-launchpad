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
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoice");

    if (!invoiceId) {
      return new Response("Missing invoice ID", { status: 400, headers: corsHeaders });
    }

    if (req.method === "GET") {
      // Fetch invoice details from WHMCS
      const invoice = await callWhmcs("GetInvoice", { invoiceid: invoiceId });
      
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
        success_url: `${url.origin}/payment-page?invoice=${invoiceId}&success=true`,
        cancel_url: `${url.origin}/payment-page?invoice=${invoiceId}`,
        metadata: {
          invoice_id: invoiceId,
          whmcs_userid: invoice.userid,
        },
      });

      // Return HTML payment page
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Pay Invoice #${invoiceId}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .invoice { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { background: #ff1493; color: white; padding: 15px 40px; text-decoration: none; 
                     border-radius: 5px; display: inline-block; font-weight: bold; border: none; cursor: pointer; }
            .success { color: green; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>ReelFlix Invoice Payment</h1>
          
          ${url.searchParams.get('success') ? '<p class="success">✓ Payment successful! Your invoice will be updated shortly.</p>' : ''}
          
          <div class="invoice">
            <h3>Invoice #${invoiceId}</h3>
            <p><strong>Status:</strong> ${invoice.status}</p>
            <p><strong>Amount Due:</strong> $${invoice.total}</p>
            <p><strong>Due Date:</strong> ${invoice.duedate}</p>
          </div>
          
          ${invoice.status !== 'Paid' ? `
            <p>Click below to pay securely with Stripe (no account required):</p>
            <a href="${session.url}" class="button">Pay $${invoice.total} with Stripe</a>
          ` : '<p>This invoice has already been paid.</p>'}
        </body>
        </html>
      `;

      return new Response(html, {
        headers: { ...corsHeaders, "content-type": "text/html" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (e) {
    console.error("Payment page error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
