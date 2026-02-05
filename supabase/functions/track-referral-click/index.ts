import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation
function validateCode(code: unknown): string | null {
  if (typeof code !== 'string') return null;
  const trimmed = code.trim().toUpperCase();
  // Allow alphanumeric codes up to 20 characters
  if (!/^[A-Z0-9]{1,20}$/.test(trimmed)) return null;
  return trimmed;
}

function validateSessionId(sessionId: unknown): string | null {
  if (sessionId === null || sessionId === undefined) return null;
  if (typeof sessionId !== 'string') return null;
  const trimmed = sessionId.trim();
  // Session IDs should be reasonable length
  if (trimmed.length > 100) return null;
  return trimmed;
}

function validateReferrerUrl(url: unknown): string | null {
  if (url === null || url === undefined) return null;
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  // Basic URL validation - limit length and check format
  if (trimmed.length > 500) return null;
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { code: rawCode, sessionId: rawSessionId, referrerUrl: rawReferrerUrl } = body;
    
    // Validate inputs
    const code = validateCode(rawCode);
    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing referral code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionId = validateSessionId(rawSessionId);
    const referrerUrl = validateReferrerUrl(rawReferrerUrl);

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get client info from request
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const userAgent = req.headers.get('user-agent')?.slice(0, 500) || 'unknown';

    // Rate limiting: Check recent clicks from same IP (max 5 per minute)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentClicksCount, error: countError } = await supabaseAdmin
      .from('referral_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('clicked_at', oneMinuteAgo);

    if (countError) {
      console.error('Error checking rate limit:', countError);
    } else if (recentClicksCount && recentClicksCount >= 5) {
      console.log('Rate limit exceeded for IP:', ipAddress);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the referral code
    const { data: referralCode, error: codeError } = await supabaseAdmin
      .from('referral_codes')
      .select('id, code, active')
      .eq('code', code)
      .single();

    if (codeError || !referralCode) {
      console.error('Referral code not found:', code);
      return new Response(
        JSON.stringify({ error: 'Invalid referral code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only track clicks for active codes
    if (!referralCode.active) {
      return new Response(
        JSON.stringify({ message: 'Code is inactive', tracked: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record the click
    const { error: insertError } = await supabaseAdmin
      .from('referral_clicks')
      .insert({
        code_id: referralCode.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer_url: referrerUrl,
        session_id: sessionId,
        converted: false
      });

    if (insertError) {
      console.error('Error inserting click:', insertError);
      throw insertError;
    }

    console.log('Click tracked successfully for code:', code);

    return new Response(
      JSON.stringify({ 
        message: 'Click tracked successfully',
        tracked: true,
        code: referralCode.code
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in track-referral-click:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
