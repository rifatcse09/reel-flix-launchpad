// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";


console.log("Env  CHECk", Deno.env.toObject())
// WHMCS helper — builds a POST to includes/api.php
async function whmcs(action: string, extra: Record<string, string | number>) {
  const url = `${Deno.env.get("WHMCS_URL")}/includes/api.php`;
  const params = new URLSearchParams({
    action,
    responsetype: "json",
    accesskey: Deno.env.get("WHMCS_API_ACCESS_KEY") ?? "",
    identifier: Deno.env.get("WHMCS_API_IDENTIFIER") ?? "",
    secret: Deno.env.get("WHMCS_API_SECRET") ?? "",
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])),
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (data.result !== "success") {
    throw new Error(`${action} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const {
      //email = `trial${Date.now()}@example.com`,
      email = ``,
      first_name = "",
      last_name = "",
      country = "",
      city = "",
      address1 = "Trial Address",
      postcode = "00000",
      phone = "",
      password = "", // WHMCS requires strong password; you can randomize
    } = body;

    const pid = Number(Deno.env.get("WHMCS_TRIAL_PRODUCT_ID") ?? "0");
    if (!pid) throw new Error("Missing WHMCS_TRIAL_PRODUCT_ID env");

    // 1) Get or create client
    let clientId: number;

    try {
      const found = await whmcs("GetClientsDetails", { email });
      clientId = Number(found.clientid);
    } catch {
      const add = await whmcs("AddClient", {
        firstname: first_name,
        lastname: last_name,
        email,
        address1,
        city,
        state: country, // WHMCS needs state; reuse country if unknown
        country,
        postcode,
        phonenumber: phone,
        password2: password,
        // optional: language, notes, marketingoptin, etc.
      });
      clientId = Number(add.clientid);
    }
    

    // 2) Create trial order (no invoice), tie to trial product
    const order = await whmcs("AddOrder", {
      clientid: clientId,
      pid,                         // product id
      billingcycle: "Free Account",     // ignored for $0 trial but required by API
      paymentmethod: Deno.env.get("WHMCS_PAYMENT_METHOD") ?? "stripe",
      noinvoice: "true",             // don't generate an invoice for free trial
      promocode: "",               // none for trial
      clientip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0] || "",
      // You can pass configurable options via "configoptions[x]=value"
    });

    const orderId = Number(order.orderid);

    // 3) Accept the order -> runs module create + sends Welcome Email
    //    sendemail=1 ensures the product's Welcome Email is sent.
    await whmcs("AcceptOrder", {
      orderid: orderId,
    });

    const serviceIds = String(order.serviceids || "")
    .split(",").map(s => Number(s.trim())).filter(Boolean);
    for (const serviceid of serviceIds) {
      await whmcs("ModuleCreate", { serviceid });
    }

    // 3) Now send the email (template uses {$service_username}, {$service_password})
    await whmcs("SendEmail", {
      messagename: "IPTV Service Details",  // your template name
      id: serviceIds[0],                    // IMPORTANT: serviceid
    });


    // Optional: Ensure module provisioning definitely runs (usually AcceptOrder does this)
    // await whmcs("ModuleCreate", { serviceid: order.productids.split(",")[0] });

    return new Response(
      JSON.stringify({ ok: true, clientId, orderId }),
      { status: 200, headers: { "Content-Type": "application/json", ...cors } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...cors } },
    );
  }
});
