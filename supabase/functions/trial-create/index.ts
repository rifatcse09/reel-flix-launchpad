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

  console.log("🚀 Trial-create function invoked");

  try {
    const body = await req.json().catch(() => ({}));
    console.log("📦 Request body received:", JSON.stringify(body));
    
    const {
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
      user_id = null, // User ID from signup for reliable profile lookup
    } = body;

    const pid = Number(Deno.env.get("WHMCS_TRIAL_PRODUCT_ID") ?? "0");
    if (!pid) throw new Error("Missing WHMCS_TRIAL_PRODUCT_ID env");

    // 1) Get or create client
    let clientId: number | undefined;

    console.log("Attempting to get/create client for email:", email);

    // First, search for existing client by email
    try {
      console.log("Searching for existing WHMCS client with email:", email);
      const searchResult = await whmcs("GetClients", { search: email });
      
      if (searchResult.clients && searchResult.clients.client) {
        const clients = Array.isArray(searchResult.clients.client) 
          ? searchResult.clients.client 
          : [searchResult.clients.client];
        
        // Find exact email match (case-insensitive)
        const matchingClient = clients.find((c: any) => 
          c.email?.toLowerCase() === email?.toLowerCase()
        );
        
        if (matchingClient) {
          clientId = Number(matchingClient.id);
          console.log("✅ Found existing WHMCS client with ID:", clientId);
        }
      }
    } catch (searchError) {
      console.log("No existing client found, will create new one");
    }

    // If no client found, create a new one
    if (!clientId) {
      console.log("Creating new WHMCS client for:", email);
      
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
      console.log("✅ Created new WHMCS client with ID:", clientId);
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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials for profile update");
      throw new Error("Server configuration error");
    }
    
    if (!email) {
      console.error("No email provided for profile update");
      throw new Error("Email is required for trial creation");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Use user_id directly if provided (more reliable than email lookup)
    if (!user_id) {
      console.error('No user_id provided');
      throw new Error("User ID is required for trial creation");
    }

    console.log('Looking up profile by user_id:', user_id);
    
    // Find user by ID (most reliable method)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', user_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error(`Failed to find user profile: ${profileError.message}`);
    }

    if (!profile) {
      console.error('No profile found for user_id:', user_id);
      throw new Error("User profile not found. Please ensure you're registered.");
    }

    console.log('Found profile:', profile.id, 'with email:', profile.email);

    const trialEnds = new Date();
    trialEnds.setHours(trialEnds.getHours() + 24);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        trial_used: true,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEnds.toISOString(),
        whmcs_client_id: String(clientId),
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Failed to update profile with trial info:', updateError);
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    console.log('✅ Successfully updated profile with trial info for user:', profile.id);

    // Create subscription record in database
    console.log('Creating subscription record for trial...');
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: profile.id,
        plan: 'Free Trial',
        amount_cents: 0,
        currency: 'USD',
        status: 'active',
        processor: 'whmcs',
        processor_client_id: String(clientId),
        processor_order_id: String(orderId),
        paid_at: new Date().toISOString(),
        ends_at: trialEnds.toISOString(),
        referral_code_id: referral_code_id,
      });

    if (subscriptionError) {
      console.error('Failed to create subscription record:', subscriptionError);
      // Don't throw - profile is already updated, this is just tracking
    } else {
      console.log('✅ Successfully created subscription record for trial');
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        clientId, 
        orderId,
        profileUpdated: true,
        userId: profile.id
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...cors } },
    );
  } catch (err: any) {
    console.error("Trial creation error:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack
    });
    
    // User-friendly error messages
    let userMessage = "Unable to start your trial. Please try again.";
    
    if (err.message?.includes("Client creation failed") || err.message?.includes("Invalid client ID")) {
      userMessage = "Unable to create your account. Please check your information and try again.";
    } else if (err.message?.includes("AddOrder failed")) {
      userMessage = "Unable to activate your trial. Please try again or contact support.";
    } else if (err.message?.includes("WHMCS_TRIAL_PRODUCT_ID")) {
      userMessage = "Trial service is temporarily unavailable. Please try again later.";
    }
    
    return new Response(
      JSON.stringify({ ok: false, error: userMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...cors } },
    );
  }
});
