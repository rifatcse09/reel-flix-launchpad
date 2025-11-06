import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function whmcs(action: string, extra: Record<string, any> = {}) {
  const url = Deno.env.get("WHMCS_URL");
  const identifier = Deno.env.get("WHMCS_API_IDENTIFIER");
  const secret = Deno.env.get("WHMCS_API_SECRET");
  const accessKey = Deno.env.get("WHMCS_API_ACCESS_KEY") ?? "";

  if (!url || !identifier || !secret) {
    throw new Error("WHMCS environment variables not configured");
  }

  const params = new URLSearchParams({
    action,
    identifier,
    secret,
    accesskey: accessKey,
    responsetype: "json",
    ...extra,
  });

  const response = await fetch(`${url}/includes/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await response.json();
  if (data.result === "error") {
    throw new Error(data.message || "WHMCS API error");
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    let result;
    switch (action) {
      case "list":
        result = await whmcs("GetPromotions", params);
        break;

      case "create":
        result = await whmcs("AddPromotion", {
          code: params.code,
          type: params.type || "Percentage",
          value: params.value,
          startdate: params.startdate,
          expirationdate: params.expirationdate || "",
          maxuses: params.maxuses || 0,
          appliesto: params.appliesto || "",
          requires: params.requires || "",
          requiresexisting: params.requiresexisting || 0,
          recurring: params.recurring || 0,
          cycles: params.cycles || "",
          applyonce: params.applyonce || 0,
          newsignups: params.newsignups || 1,
          existingclient: params.existingclient || 0,
          onceperclient: params.onceperclient || 0,
          recurfor: params.recurfor || 0,
          notes: params.notes || "",
        });
        break;

      case "update":
        result = await whmcs("UpdatePromotion", {
          promotionid: params.promotionid,
          code: params.code,
          type: params.type,
          value: params.value,
          startdate: params.startdate,
          expirationdate: params.expirationdate || "",
          maxuses: params.maxuses,
          appliesto: params.appliesto || "",
          requires: params.requires || "",
          requiresexisting: params.requiresexisting,
          recurring: params.recurring,
          cycles: params.cycles || "",
          applyonce: params.applyonce,
          newsignups: params.newsignups,
          existingclient: params.existingclient,
          onceperclient: params.onceperclient,
          recurfor: params.recurfor,
          notes: params.notes || "",
        });
        break;

      case "delete":
        result = await whmcs("DeletePromotion", {
          promotionid: params.promotionid,
        });
        break;

      case "validate":
        // Validate a promotion code
        result = await whmcs("ValidatePromotion", {
          code: params.code,
          pid: params.pid || "",
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in whmcs-promotions:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
