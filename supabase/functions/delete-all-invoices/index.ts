// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

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

    console.log("Starting bulk invoice void...");

    // Get all unpaid invoices from the internal database
    const { data: invoices, error: fetchError } = await sb
      .from("invoices")
      .select("id, invoice_number, status")
      .eq("status", "unpaid");

    if (fetchError) {
      throw new Error(`Failed to fetch invoices: ${fetchError.message}`);
    }

    const invoiceArray = invoices || [];
    console.log(`Found ${invoiceArray.length} unpaid invoices to void`);

    let voidedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const invoice of invoiceArray) {
      try {
        console.log(`Voiding invoice ${invoice.invoice_number}...`);
        
        const { error: updateError } = await sb
          .from("invoices")
          .update({ status: "void" })
          .eq("id", invoice.id);

        if (updateError) throw updateError;
        
        voidedCount++;
      } catch (error: any) {
        console.error(`Failed to void invoice:`, error);
        failedCount++;
        errors.push(`Invoice ${invoice.invoice_number}: ${error.message}`);
      }
    }

    console.log(`Void complete: ${voidedCount} voided, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        ok: true,
        deleted: voidedCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully voided ${voidedCount} invoices${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
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
