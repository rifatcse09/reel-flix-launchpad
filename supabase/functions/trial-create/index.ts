// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Input validation helpers
function validateEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 255) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

function validateString(value: unknown, maxLength: number, defaultVal = ''): string {
  if (typeof value !== 'string') return defaultVal;
  const trimmed = value.trim();
  return trimmed.slice(0, maxLength) || defaultVal;
}

function validateUserId(userId: unknown): string | null {
  if (typeof userId !== 'string') return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return null;
  return userId;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory rate limiting (per function instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 300000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 3;

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
    const referral_code_id = body.referral_code_id && typeof body.referral_code_id === 'string' 
      ? body.referral_code_id.slice(0, 50) 
      : null;
    
    // Validate user_id matches authenticated user
    const user_id = validateUserId(body.user_id);
    if (!user_id || user_id !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'User ID mismatch' }),
        { status: 403, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find user profile
    console.log('🔍 Looking up profile by user_id:', user_id);
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
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

    // Set trial duration (default 24 hours)
    const trialEnds = new Date();
    trialEnds.setHours(trialEnds.getHours() + 24);

    console.log('📝 Updating profile with trial info');

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        trial_used: true,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEnds.toISOString(),
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('❌ Failed to update profile with trial info:', updateError);
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    console.log('✅ Successfully updated profile with trial info for user:', profile.id);

    // Check AUTO_PROVISION feature flag
    const { data: provisionSetting } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('category', 'provisioning')
      .eq('key', 'AUTO_PROVISION')
      .maybeSingle();

    const autoProvision = provisionSetting?.value === true || provisionSetting?.value === 'true';
    console.log('AUTO_PROVISION feature flag:', autoProvision);

    // Create subscription record — internal tracking only
    console.log('Creating subscription record for trial...');
    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: profile.id,
        plan: 'Free Trial',
        amount_cents: 0,
        currency: 'USD',
        status: 'active',
        processor: 'internal',
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
        profileUpdated: true,
        userId: profile.id
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...cors } },
    );
  } catch (err: any) {
    const errorCode = `TRIAL_${Date.now().toString(36).toUpperCase()}`;
    console.error('Trial creation failed:', { code: errorCode, timestamp: new Date().toISOString() });
    
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
