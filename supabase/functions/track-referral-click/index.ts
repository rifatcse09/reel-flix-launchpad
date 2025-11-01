import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, sessionId, referrerUrl } = await req.json();
    
    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Referral code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

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
      .eq('code', code.toUpperCase())
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
        referrer_url: referrerUrl || null,
        session_id: sessionId || null,
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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
