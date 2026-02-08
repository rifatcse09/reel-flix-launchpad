// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Input validation helpers
function validateEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 255) return null;
  // Basic email pattern
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

function validateString(value: unknown, maxLength: number, defaultVal = ''): string {
  if (typeof value !== 'string') return defaultVal;
  const trimmed = value.trim();
  return trimmed.slice(0, maxLength) || defaultVal;
}

function validatePhone(phone: unknown): string {
  if (typeof phone !== 'string') return '0000000000';
  // Only allow digits, spaces, dashes, plus sign, and parentheses
  const cleaned = phone.replace(/[^\d\s\-+()]/g, '').slice(0, 20);
  return cleaned || '0000000000';
}

function validateUserId(userId: unknown): string | null {
  if (typeof userId !== 'string') return null;
  // UUID format validation
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return null;
  return userId;
}

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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory rate limiting (per function instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 300000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 trial creation attempts per 5 minutes per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  record.count++;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  console.log("🚀 Trial-create function invoked");

  try {
    // Get IP for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    // Rate limiting check
    if (isRateLimited(ipAddress)) {
      console.log('Rate limit exceeded for IP:', ipAddress);
      return new Response(
        JSON.stringify({ ok: false, error: 'Too many trial requests. Please try again later.' }),
        { status: 429, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    // Verify JWT authentication
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Authentication required' }),
        { status: 401, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    // Verify the token
    const userSupabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await userSupabase.auth.getClaims(token);
    
    if (claimsError || !claims?.claims) {
      console.error('JWT validation failed:', claimsError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    const authenticatedUserId = claims.claims.sub;
    if (!authenticatedUserId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'User not authenticated' }),
        { status: 401, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    const body = await req.json().catch(() => ({}));
    console.log("📦 Request body received");
    
    // Validate and sanitize all inputs
    const email = validateEmail(body.email);
    if (!email) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid email address' }),
        { status: 400, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    const first_name = validateString(body.first_name, 50, 'Trial');
    const last_name = validateString(body.last_name, 50, 'User');
    const country = validateString(body.country, 2, 'US').toUpperCase();
    const city = validateString(body.city, 100, 'Unknown');
    const address1 = validateString(body.address1, 200, 'Trial Address');
    const postcode = validateString(body.postcode, 20, '00000');
    const phone = validatePhone(body.phone);
    const password = validateString(body.password, 100) || `Trial${Date.now()}!`;
    const referral_code_id = body.referral_code_id && typeof body.referral_code_id === 'string' 
      ? body.referral_code_id.slice(0, 50) 
      : null;
    const whmcs_affiliate_id = typeof body.whmcs_affiliate_id === 'number' 
      ? body.whmcs_affiliate_id 
      : null;
    
    // Validate user_id matches authenticated user
    const user_id = validateUserId(body.user_id);
    if (!user_id || user_id !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'User ID mismatch' }),
        { status: 403, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

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
        firstname: first_name,
        lastname: last_name,
        email,
        address1,
        city,
        state: country,
        country,
        postcode,
        phonenumber: phone,
        password2: password,
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
      clientip: ipAddress,
    };

    // Add affiliate tracking if provided
    if (whmcs_affiliate_id) {
      orderParams.affid = whmcs_affiliate_id;
      console.log("Adding affiliate ID to trial order:", whmcs_affiliate_id);
    }

    const order = await whmcs("AddOrder", orderParams);

    const orderId = Number(order.orderid);

    // Check AUTO_PROVISION feature flag
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: provisionSetting } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('category', 'provisioning')
      .eq('key', 'AUTO_PROVISION')
      .maybeSingle();

    const autoProvision = provisionSetting?.value === true || provisionSetting?.value === 'true';
    console.log('AUTO_PROVISION feature flag:', autoProvision);

    if (autoProvision) {
      // 3) Accept the order -> runs module create + sends Welcome Email
      await whmcs("AcceptOrder", {
        orderid: orderId,
      });

      const serviceIds = String(order.serviceids || "")
      .split(",").map(s => Number(s.trim())).filter(Boolean);
      for (const serviceid of serviceIds) {
        await whmcs("ModuleCreate", { serviceid });
      }

      // Send the email (template uses {$service_username}, {$service_password})
      await whmcs("SendEmail", {
        messagename: "IPTV Service Details",
        id: serviceIds[0],
      });
      console.log('✅ Auto-provisioning completed for trial');
    } else {
      console.log('⏸️ Auto-provisioning DISABLED - order will require manual provisioning');
      // Send "order being prepared" email instead
      try {
        await whmcs("SendEmail", {
          messagename: "Order Being Prepared",
          id: orderId,
          customtype: "general",
          customsubject: "Your ReelFlix Order is Being Prepared",
          custommessage: "Thank you for your order. Your streaming access will be delivered shortly.\n\nOur team is currently preparing your account.",
        });
        console.log('✅ "Order Being Prepared" email sent');
      } catch (emailErr) {
        console.error('Failed to send preparation email:', emailErr);
        // Continue - don't block trial creation
      }
    }


    // Update Supabase profile with trial info
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🔍 Looking up profile by user_id:', user_id);
    
    // Find user by ID (most reliable method)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, whmcs_client_id')
      .eq('id', user_id)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      throw new Error(`Failed to find user profile: ${profileError.message}`);
    }

    if (!profile) {
      console.error('❌ No profile found for user_id:', user_id);
      throw new Error("User profile not found. Please ensure you're registered.");
    }

    console.log('✅ Found profile:', profile.id, 'with email:', profile.email);
    console.log('📝 Current WHMCS client ID:', profile.whmcs_client_id);

    const trialEnds = new Date();
    trialEnds.setHours(trialEnds.getHours() + 24);

    console.log('📝 Updating profile with:');
    console.log('  - trial_used: true');
    console.log('  - trial_started_at:', new Date().toISOString());
    console.log('  - trial_ends_at:', trialEnds.toISOString());
    console.log('  - whmcs_client_id:', String(clientId));

    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({
        trial_used: true,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEnds.toISOString(),
        whmcs_client_id: String(clientId),
      })
      .eq('id', profile.id)
      .select();

    if (updateError) {
      console.error('❌ Failed to update profile with trial info:', updateError);
      console.error('❌ Error details:', JSON.stringify(updateError));
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    console.log('✅ Profile update result:', updateData);
    console.log('✅ Successfully updated profile with trial info for user:', profile.id);

    // Create subscription record in database
    console.log('Creating subscription record for trial...');
    const { error: subscriptionError } = await supabaseAdmin
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
        provisioning_status: autoProvision ? 'provisioned' : 'pending_provision',
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
    // Sanitized logging - no stack traces or sensitive details in production
    const errorCode = `TRIAL_${Date.now().toString(36).toUpperCase()}`;
    console.error('Trial creation failed:', { code: errorCode, timestamp: new Date().toISOString() });
    
    // Generic user-facing error - never expose internal details
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: "Unable to start your trial. Please try again or contact support.",
        code: errorCode
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...cors } },
    );
  }
});
