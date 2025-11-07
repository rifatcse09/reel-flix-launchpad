// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";


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
      referral_code_id = null,
      whmcs_affiliate_id = null,
    } = body;

    const pid = Number(Deno.env.get("WHMCS_TRIAL_PRODUCT_ID") ?? "0");
    if (!pid) throw new Error("Missing WHMCS_TRIAL_PRODUCT_ID env");

    // 1) Get or create client
    let clientId: number;

    console.log("Attempting to get/create client for email:", email);

    try {
      const found = await whmcs("GetClientsDetails", { email });
      clientId = Number(found.clientid);
      console.log("Found existing client:", clientId);
    } catch (getError) {
      console.log("Client not found, creating new client...", getError);
      
      const add = await whmcs("AddClient", {
        firstname: first_name || "Trial",
        lastname: last_name || "User",
        email,
        address1,
        city: city || "Unknown",
        state: country || "US",
        country: country || "US",
        postcode,
        phonenumber: phone || "0000000000",
        password2: password || `Trial${Date.now()}!`,
      });
      
      console.log("AddClient response:", JSON.stringify(add));
      
      if (!add.clientid) {
        throw new Error("Client creation failed - no clientid returned");
      }
      
      clientId = Number(add.clientid);
      console.log("Created new client:", clientId);
    }
    
    if (!clientId || clientId === 0) {
      throw new Error("Invalid client ID: " + clientId);
    }
    

    // 2) Create trial order (no invoice), tie to trial product
    const orderParams: any = {
      clientid: clientId,
      pid,                         // product id
      billingcycle: "Free Account",     // ignored for $0 trial but required by API
      paymentmethod: Deno.env.get("WHMCS_PAYMENT_METHOD") ?? "stripe",
      noinvoice: "true",             // don't generate an invoice for free trial
      promocode: "",               // none for trial
      clientip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0] || "",
      // You can pass configurable options via "configoptions[x]=value"
    };

    // Add affiliate tracking if provided
    if (whmcs_affiliate_id) {
      orderParams.affid = whmcs_affiliate_id;
      console.log("Adding affiliate ID to trial order:", whmcs_affiliate_id);
    }

    const order = await whmcs("AddOrder", orderParams);

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


    // Update Supabase profile with trial info
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseServiceKey && email) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Find user by email
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (profile) {
          const trialEnds = new Date();
          trialEnds.setHours(trialEnds.getHours() + 24);

          await supabase
            .from('profiles')
            .update({
              trial_used: true,
              trial_started_at: new Date().toISOString(),
              trial_ends_at: trialEnds.toISOString(),
              whmcs_client_id: String(clientId),
            })
            .eq('id', profile.id);

          console.log('Updated profile with trial info for user:', profile.id);
        }
      } catch (dbError) {
        console.error('Failed to update profile with trial info:', dbError);
        // Don't fail the whole request if DB update fails
      }
    }

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
