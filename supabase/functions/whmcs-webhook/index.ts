// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("WHMCS_WEBHOOK_SECRET")!; // <-- same as in WHMCS hook

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function requireHeader(req: Request, name: string, expected: string) {
  const v = req.headers.get(name);
  return v && v === expected;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json(405, { ok: false, error: "Use POST" });

    // 🔐 Verify shared secret from WHMCS hook
    if (!WEBHOOK_SECRET || !requireHeader(req, "x-whmcs-secret", WEBHOOK_SECRET)) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    const payload = await req.json().catch(() => ({} as any));
    const event = String(payload.event || payload.type || payload.name || "").trim();

    if (!event) return json(400, { ok: false, error: "Missing event" });

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

      const { data: sub } = await sb
        .from("subscriptions")
        .update({ status: "active", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("processor_invoice_id", invoiceId)
        .select("id,user_id,plan_name_cache,ends_at")
        .maybeSingle();

      if (sub?.user_id) {
        await sb.from("profiles").update({
          subscription_status: "active",
          subscription_plan: sub.plan_name_cache,
          subscription_ends_at: sub.ends_at,
          trial_used: true,
          updated_at: new Date().toISOString(),
        }).eq("id", sub.user_id);
      }

      return json(200, { ok: true, handled: "InvoicePaid", invoiceId });
    }

    // Module/Create or Addon/Activated -> also mark active
    if (["AfterModuleCreate", "ServiceActivated", "addon.activated", "AfterAddonActivated"].includes(event)) {
      // Prefer linking by service/order id; fallback to client
      if (orderId || serviceId) {
        const { data: sub } = await sb
          .from("subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .or(`processor_order_id.eq.${orderId},processor_order_id.eq.${serviceId}`)
          .select("id,user_id,plan_name_cache,ends_at")
          .maybeSingle();

        if (sub?.user_id) {
          await sb.from("profiles").update({
            subscription_status: "active",
            subscription_plan: sub.plan_name_cache,
            subscription_ends_at: sub.ends_at,
            trial_used: true,
            updated_at: new Date().toISOString(),
          }).eq("id", sub.user_id);
        }
      } else if (clientId) {
        // Fallback: latest pending sub for this client
        const { data: latest } = await sb
          .from("subscriptions")
          .select("id,user_id,plan_name_cache,ends_at")
          .eq("processor_client_id", clientId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latest) {
          await sb.from("subscriptions")
            .update({ status: "active", updated_at: new Date().toISOString() })
            .eq("id", latest.id);

          await sb.from("profiles").update({
            subscription_status: "active",
            subscription_plan: latest.plan_name_cache,
            subscription_ends_at: latest.ends_at,
            trial_used: true,
            updated_at: new Date().toISOString(),
          }).eq("id", latest.user_id);
        }
      }

      // Optional: if WHMCS sent next due date, save it to profile mirror
      if (nextDue && clientId) {
        const { data: owner } = await sb
          .from("profiles").select("id").eq("whmcs_client_id", clientId).maybeSingle();
        if (owner?.id) {
          await sb.from("profiles")
            .update({ subscription_ends_at: nextDue, updated_at: new Date().toISOString() })
            .eq("id", owner.id);
        }
      }

      return json(200, { ok: true, handled: event, orderId, serviceId });
    }

    // Suspended
    if (["AfterModuleSuspend", "ServiceSuspended", "addon.suspended", "AfterAddonSuspended"].includes(event)) {
      const matchId = orderId || serviceId;
      if (!matchId && !clientId) return json(400, { ok: false, error: "Missing ids" });

      if (matchId) {
        const { data: sub } = await sb
          .from("subscriptions")
          .update({ status: "suspended", updated_at: new Date().toISOString() })
          .or(`processor_order_id.eq.${orderId},processor_order_id.eq.${serviceId}`)
          .select("user_id").maybeSingle();

        if (sub?.user_id) {
          await sb.from("profiles").update({
            subscription_status: "suspended", updated_at: new Date().toISOString(),
          }).eq("id", sub.user_id);
        }
      } else if (clientId) {
        await sb.from("subscriptions")
          .update({ status: "suspended", updated_at: new Date().toISOString() })
          .eq("processor_client_id", clientId)
          .neq("status", "canceled");
      }

      return json(200, { ok: true, handled: event });
    }

    // Cancelled/Terminated
    if (["AfterModuleTerminate", "ServiceCancelled", "ServiceTerminated", "addon.terminated", "AfterAddonTerminated", "CancellationRequest"].includes(event)) {
      const matchId = orderId || serviceId;
      if (!matchId && !clientId) return json(400, { ok: false, error: "Missing ids" });

      if (matchId) {
        await sb.from("subscriptions")
          .update({ status: "canceled", canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .or(`processor_order_id.eq.${orderId},processor_order_id.eq.${serviceId}`);
      } else if (clientId) {
        await sb.from("subscriptions")
          .update({ status: "canceled", canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("processor_client_id", clientId);
      }

      return json(200, { ok: true, handled: event });
    }

    // Unknown / ignored
    return json(200, { ok: true, ignored: true, event, payload });
  } catch (e) {
    console.error("webhook error:", e);
    return json(500, { ok: false, error: String((e as Error).message || e) });
  }
});
