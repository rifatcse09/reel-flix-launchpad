import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhmcsResponse {
  result: string;
  affiliateid?: number;
  message?: string;
}

async function callWhmcs(action: string, params: Record<string, any>): Promise<WhmcsResponse> {
  const whmcsUrl = Deno.env.get('WHMCS_URL');
  const identifier = Deno.env.get('WHMCS_API_IDENTIFIER');
  const secret = Deno.env.get('WHMCS_API_SECRET');

  if (!whmcsUrl || !identifier || !secret) {
    throw new Error('WHMCS credentials not configured');
  }

  const body = new URLSearchParams({
    action,
    identifier,
    secret,
    responsetype: 'json',
    ...params,
  });

  console.log('Calling WHMCS API:', action, params);

  const response = await fetch(whmcsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await response.json();
  console.log('WHMCS Response:', data);

  if (data.result !== 'success') {
    throw new Error(data.message || 'WHMCS API call failed');
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRoles) {
      throw new Error('Admin access required');
    }

    const { email, firstName, lastName } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    console.log('Creating WHMCS affiliate for:', email);

    // Check if affiliate already exists for this email
    try {
      const searchResult = await callWhmcs('GetAffiliates', {
        search: email,
      });

      if (searchResult.affiliates && searchResult.affiliates.affiliate) {
        const affiliates = Array.isArray(searchResult.affiliates.affiliate) 
          ? searchResult.affiliates.affiliate 
          : [searchResult.affiliates.affiliate];
        
        const existingAffiliate = affiliates.find((aff: any) => 
          aff.email?.toLowerCase() === email.toLowerCase()
        );

        if (existingAffiliate) {
          console.log('Affiliate already exists:', existingAffiliate.id);
          return new Response(
            JSON.stringify({
              success: true,
              affiliateId: parseInt(existingAffiliate.id),
              message: 'Affiliate already exists',
              existing: true,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (searchError) {
      console.log('Affiliate search failed or no results:', searchError);
      // Continue to create new affiliate
    }

    // Create new affiliate in WHMCS
    const createResult = await callWhmcs('AffiliateActivate', {
      userid: 0, // Will be linked when user makes first purchase
      firstname: firstName || email.split('@')[0],
      lastname: lastName || '',
      email: email,
      payto: email,
      paymenttype: 'paypal',
    });

    if (!createResult.affiliateid) {
      throw new Error('Failed to get affiliate ID from WHMCS');
    }

    console.log('Affiliate created successfully:', createResult.affiliateid);

    return new Response(
      JSON.stringify({
        success: true,
        affiliateId: createResult.affiliateid,
        message: 'Affiliate created successfully',
        existing: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating WHMCS affiliate:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to create affiliate'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
