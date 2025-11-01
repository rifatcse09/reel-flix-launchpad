import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get IP address from request headers
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    console.log('Checking trial limit for IP:', ipAddress);

    // Count how many trials have been used from this IP
    const { count, error: countError } = await supabase
      .from('trial_ip_usage')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipAddress);

    if (countError) {
      console.error('Error counting trials:', countError);
      throw countError;
    }

    const trialCount = count || 0;
    const maxTrials = 2;
    const canSignup = trialCount < maxTrials;

    console.log(`IP ${ipAddress} has used ${trialCount}/${maxTrials} trials`);

    return new Response(
      JSON.stringify({
        canSignup,
        trialCount,
        maxTrials,
        remainingTrials: Math.max(0, maxTrials - trialCount),
        ipAddress
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in validate-trial-signup:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
