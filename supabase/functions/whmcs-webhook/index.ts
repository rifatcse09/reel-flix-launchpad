// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("WHMCS_WEBHOOK_SECRET")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function logEvent(
  event_type: string,
  entity_type: string,
  entity_id: string,
  status: string,
  metadata: Record<string, unknown> = {},
  error_message?: string
) {
  try {
    await sb.from("system_event_log").insert({
      event_type,
      entity_type,
      entity_id,
      status,
      metadata,
      error_message: error_message || null,
    });
  } catch (e) {
    console.error("Failed to write system_event_log:", e);
  }
}

// HMAC-SHA256 signature verification for webhook security
async function verifyHmacSignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) return false;
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

// Legacy header-based verification (for backward compatibility)
function requireHeader(req: Request, name: string, expected: string) {
  const v = req.headers.get(name);
  return v && v === expected;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json(405, { ok: false, error: "Use POST" });

    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    
    // 🔐 Verify HMAC signature (preferred) or fall back to header secret
    const isHmacValid = await verifyHmacSignature(rawBody, signature, WEBHOOK_SECRET);
    const isHeaderValid = requireHeader(req, "x-whmcs-secret", WEBHOOK_SECRET);
    
    if (!WEBHOOK_SECRET || (!isHmacValid && !isHeaderValid)) {
      await logEvent("whmcs_webhook_auth_failed", "system", "whmcs-webhook", "fail", {}, "Unauthorized webhook attempt");
      return json(401, { ok: false, error: "Unauthorized" });
    }

    const payload = JSON.parse(rawBody || "{}") as any;
    const event = String(payload.event || payload.type || payload.name || "").trim();

    if (!event) return json(400, { ok: false, error: "Missing event" });

    // Log webhook received
    await logEvent("whmcs_webhook_received", "system", "whmcs-webhook", "success", { event });

    // Helpers to normalize common IDs
    const invoiceId = String(payload.invoice_id ?? payload.invoiceid ?? "").trim();
    const orderId   = String(payload.order_id   ?? payload.orderid   ?? "").trim();
    const serviceId = String(payload.serviceid  ?? "").trim();
    const clientId  = String(payload.client_id  ?? payload.userid    ?? payload.user_id ?? "").trim();
    const nextDue   = payload.nextduedate ? new Date(payload.nextduedate).toISOString() : null;

    // ---- Event Routing ----
    // InvoicePaid -> mark subscription active by invoice
    if (event === "InvoicePaid" || event === "invoice.paid") {
      if (!invoiceId) return json(400, { ok: false, error: "Missing invoice id" });

      // Check AUTO_PROVISION feature flag
      const { data: provisionSetting } = await sb
        .from('app_settings')
        .select('value')
        .eq('category', 'provisioning')
        .eq('key', 'AUTO_PROVISION')
        .maybeSingle();

      const autoProvision = provisionSetting?.value === true || provisionSetting?.value === 'true';

      const { data: sub } = await sb
        .from("subscriptions")
        .update({ 
          status: "active", 
          paid_at: new Date().toISOString(),
          provisioning_status: autoProvision ? 'provisioned' : 'pending_provision',
        })
        .eq("processor_invoice_id", invoiceId)
        .select("id,user_id")
        .maybeSingle();

      await logEvent("whmcs_invoice_paid", "subscription", sub?.id || invoiceId, "success", { event, invoiceId, autoProvision });
      return json(200, { ok: true, handled: "InvoicePaid", invoiceId, autoProvision });
    }

    // Module/Create or Addon/Activated -> also mark active
    if (["AfterModuleCreate", "ServiceActivated", "addon.activated", "AfterAddonActivated"].includes(event)) {
      if (orderId || serviceId) {
        await sb
          .from("subscriptions")
          .update({ status: "active" })
          .or(`processor_order_id.eq.${orderId},processor_order_id.eq.${serviceId}`);
      } else if (clientId) {
        const { data: latest } = await sb
          .from("subscriptions")
          .select("id")
          .eq("processor_client_id", clientId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latest) {
          await sb.from("subscriptions")
            .update({ status: "active" })
            .eq("id", latest.id);
        }
      }

      await logEvent("whmcs_service_activated", "subscription", orderId || serviceId || clientId, "success", { event });
      return json(200, { ok: true, handled: event, orderId, serviceId });
    }

    // Suspended
    if (["AfterModuleSuspend", "ServiceSuspended", "addon.suspended", "AfterAddonSuspended"].includes(event)) {
      const matchId = orderId || serviceId;
      if (!matchId && !clientId) return json(400, { ok: false, error: "Missing ids" });

      if (matchId) {
        await sb
          .from("subscriptions")
          .update({ status: "suspended" })
          .or(`processor_order_id.eq.${orderId},processor_order_id.eq.${serviceId}`);
      } else if (clientId) {
        await sb.from("subscriptions")
          .update({ status: "suspended" })
          .eq("processor_client_id", clientId)
          .neq("status", "canceled");
      }

      await logEvent("whmcs_service_suspended", "subscription", matchId || clientId, "success", { event });
      return json(200, { ok: true, handled: event });
    }

    // Cancelled/Terminated
    if (["AfterModuleTerminate", "ServiceCancelled", "ServiceTerminated", "addon.terminated", "AfterAddonTerminated", "CancellationRequest"].includes(event)) {
      const matchId = orderId || serviceId;
      if (!matchId && !clientId) return json(400, { ok: false, error: "Missing ids" });

      if (matchId) {
        await sb.from("subscriptions")
          .update({ status: "canceled" })
          .or(`processor_order_id.eq.${orderId},processor_order_id.eq.${serviceId}`);
      } else if (clientId) {
        await sb.from("subscriptions")
          .update({ status: "canceled" })
          .eq("processor_client_id", clientId);
      }

      await logEvent("whmcs_service_terminated", "subscription", matchId || clientId, "success", { event });
      return json(200, { ok: true, handled: event });
    }

    // Unknown / ignored
    await logEvent("whmcs_webhook_ignored", "system", "whmcs-webhook", "success", { event, ignored: true });
    return json(200, { ok: true, ignored: true, event });
  } catch (e) {
    console.error("webhook error:", e);
    await logEvent("whmcs_webhook_error", "system", "whmcs-webhook", "fail", {}, String((e as Error).message || e));
    return json(500, { ok: false, error: String((e as Error).message || e) });
  }
});
