// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHMCS_URL = Deno.env.get("WHMCS_URL")!;
const WHMCS_API_IDENTIFIER = Deno.env.get("WHMCS_API_IDENTIFIER")!;
const WHMCS_API_SECRET = Deno.env.get("WHMCS_API_SECRET")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function callWhmcs(action: string, payload: Record<string, any>) {
  const body = new URLSearchParams({
    action,
    identifier: WHMCS_API_IDENTIFIER,
    secret: WHMCS_API_SECRET,
    accesskey: Deno.env.get("WHMCS_API_ACCESS_KEY") ?? "",
    responsetype: "json",
    ...Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)])),
  });

  const res = await fetch(`${WHMCS_URL}/includes/api.php`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await res.json();
  if (json.result !== "success") {
    throw new Error(`WHMCS ${action} failed: ${JSON.stringify(json)}`);
  }
  return json;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Use POST" }), {
        status: 405,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "Missing auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Verify user is admin
    const { data: { user }, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const { data: roleData } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ ok: false, error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    console.log("Starting bulk invoice deletion...");

    // Get all invoices
    const invoicesResponse = await callWhmcs("GetInvoices", {
      limitnum: 1000,
    });

    const invoices = invoicesResponse.invoices?.invoice || [];
    const invoiceArray = Array.isArray(invoices) ? invoices : [invoices];
    
    console.log(`Found ${invoiceArray.length} invoices to delete`);

    let deletedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const invoice of invoiceArray) {
      try {
        const invoiceId = invoice.id || invoice.invoiceid;
        console.log(`Deleting invoice ${invoiceId}...`);
        
        // WHMCS doesn't have a direct delete API, so we'll cancel it
        await callWhmcs("UpdateInvoice", {
          invoiceid: invoiceId,
          status: "Cancelled",
        });
        
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete invoice:`, error);
        failedCount++;
        errors.push(`Invoice ${invoice.id}: ${error.message}`);
      }
    }

    console.log(`Deletion complete: ${deletedCount} cancelled, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        ok: true,
        deleted: deletedCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully cancelled ${deletedCount} invoices${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
      }),
      {
        headers: { ...corsHeaders, "content-type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      }
    );
  }
});
