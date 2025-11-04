import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      throw new Error('Admin access required');
    }

    console.log('Starting database export...');

    // Define tables to export in order (respecting foreign keys)
    const tables = [
      'profiles',
      'user_roles',
      'user_sessions',
      'plans',
      'referral_codes',
      'referral_clicks',
      'referral_uses',
      'referral_alert_thresholds',
      'referrer_commissions',
      'payout_logs',
      'subscriptions',
      'trial_ip_usage',
      'notification_templates',
      'notifications',
      'notification_reads',
      'notification_clicks',
      'notification_preferences',
      'app_settings'
    ];

    const exportData: Record<string, any[]> = {};
    let totalRecords = 0;

    // Export each table
    for (const table of tables) {
      try {
        const { data, error } = await supabaseClient
          .from(table)
          .select('*')
          .order('created_at', { ascending: true, nullsFirst: false });

        if (error) {
          console.error(`Error exporting ${table}:`, error);
          exportData[table] = [];
        } else {
          exportData[table] = data || [];
          totalRecords += (data || []).length;
          console.log(`Exported ${table}: ${(data || []).length} records`);
        }
      } catch (err) {
        console.error(`Failed to export ${table}:`, err);
        exportData[table] = [];
      }
    }

    const result = {
      exported_at: new Date().toISOString(),
      total_tables: tables.length,
      total_records: totalRecords,
      tables: exportData,
      metadata: {
        project_id: Deno.env.get('SUPABASE_PROJECT_ID'),
        version: '1.0',
        note: 'Import this data into your new Supabase project after running migrations'
      }
    };

    console.log(`Export complete: ${totalRecords} total records from ${tables.length} tables`);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="database-export.json"'
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
