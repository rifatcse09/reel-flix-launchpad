import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!stripeSecretKey || !stripeWebhookSecret) {
      console.error('Missing Stripe configuration');
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No signature found');
      return new Response(
        JSON.stringify({ error: 'No signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${err.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Event type:', event.type);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle successful payment events
    if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
      const session = event.data.object as any;
      
      const userId = session.client_reference_id || session.metadata?.user_id;
      const plan = session.metadata?.plan || session.line_items?.data?.[0]?.price?.nickname || 'Unknown Plan';
      const amountCents = session.amount_total ?? session.amount_paid ?? 0;
      const currency = (session.currency || 'usd').toUpperCase();
      const refCodeRaw = session.metadata?.ref || null;

      console.log('Processing payment:', { userId, plan, amountCents, refCodeRaw });

      let referralCodeId = null;
      
      // Look up referral code if provided
      if (refCodeRaw) {
        const refCode = refCodeRaw.toUpperCase();
        console.log('Looking up referral code:', refCode);
        
        const { data: codeData, error: codeError } = await supabase
          .from('referral_codes')
          .select('id')
          .eq('code', refCode)
          .maybeSingle();
        
        if (codeError) {
          console.error('Error looking up referral code:', codeError);
        } else if (codeData) {
          referralCodeId = codeData.id;
          console.log('Found referral code ID:', referralCodeId);
        } else {
          console.log('Referral code not found:', refCode);
        }
      }

      // Insert subscription record
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan,
          amount_cents: amountCents,
          currency,
          status: 'paid',
          paid_at: new Date().toISOString(),
          processor: 'stripe',
          processor_invoice_id: session.id,
          referral_code_id: referralCodeId
        });

      if (insertError) {
        console.error('Error inserting subscription:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to record subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Subscription recorded successfully');
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
