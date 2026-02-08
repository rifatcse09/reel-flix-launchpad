import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const FROM_EMAIL = "ReelFlix <noreply@reelflix.tv>";

// ── Helpers ──────────────────────────────────────────────────────

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

async function updateEmailTracker(invoice_id: string, email_type: string) {
  try {
    await sb
      .from("invoices")
      .update({
        last_email_sent_at: new Date().toISOString(),
        last_email_type: email_type,
      })
      .eq("id", invoice_id);
  } catch (e) {
    console.error("Failed to update email tracker:", e);
  }
}

// ── Email builders ───────────────────────────────────────────────

function buildInvoiceCreatedEmail(
  invoice: { invoice_number: string; amount_cents: number; currency: string; plan_name: string | null },
  customerName: string
) {
  return {
    subject: `Your ReelFlix Invoice ${invoice.invoice_number}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 0;">
        <div style="background: linear-gradient(135deg, #ff1493, #e91e63); padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; letter-spacing: -0.5px;">ReelFlix</h1>
          <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Invoice Created</p>
        </div>
        <div style="padding: 30px;">
          <p style="margin: 0 0 20px;">Hi ${customerName},</p>
          <p style="margin: 0 0 20px;">Your invoice has been created and is ready for payment.</p>
          <div style="background: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #999;">Invoice Number</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${invoice.invoice_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #999;">Plan</td>
                <td style="padding: 8px 0; text-align: right;">${invoice.plan_name || "—"}</td>
              </tr>
              <tr style="border-top: 1px solid #333;">
                <td style="padding: 12px 0 8px; color: #999; font-weight: bold;">Total</td>
                <td style="padding: 12px 0 8px; text-align: right; font-size: 20px; font-weight: bold; color: #ff1493;">
                  $${(invoice.amount_cents / 100).toFixed(2)} ${invoice.currency}
                </td>
              </tr>
            </table>
          </div>
          <p style="margin: 20px 0; color: #999; font-size: 13px;">
            Complete your payment to activate your subscription. You can view your invoices anytime in your ReelFlix dashboard.
          </p>
        </div>
        <div style="padding: 20px 30px; background: #1a1a1a; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">© ${new Date().getFullYear()} ReelFlix. All rights reserved.</p>
        </div>
      </div>
    `,
  };
}

function buildPaymentConfirmedEmail(
  invoice: { invoice_number: string; amount_cents: number; currency: string; plan_name: string | null },
  customerName: string
) {
  return {
    subject: `Payment Confirmed – ${invoice.invoice_number}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 0;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">ReelFlix</h1>
          <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Payment Confirmed ✓</p>
        </div>
        <div style="padding: 30px;">
          <p style="margin: 0 0 20px;">Hi ${customerName},</p>
          <p style="margin: 0 0 20px;">Great news! Your payment of <strong>$${(invoice.amount_cents / 100).toFixed(2)} ${invoice.currency}</strong> for invoice <strong>${invoice.invoice_number}</strong> has been verified.</p>
          <div style="background: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 8px; font-size: 16px; font-weight: bold; color: #22c55e;">✓ Payment Received</p>
            <p style="margin: 0; color: #999; font-size: 13px;">Your subscription credentials are being prepared by our team.</p>
          </div>
          <p style="margin: 20px 0; color: #999; font-size: 13px;">
            Our team is setting up your account. You'll receive your credentials shortly. No action is needed on your part.
          </p>
        </div>
        <div style="padding: 20px 30px; background: #1a1a1a; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">© ${new Date().getFullYear()} ReelFlix. All rights reserved.</p>
        </div>
      </div>
    `,
  };
}

function buildCredentialsSentEmail(
  invoice: { invoice_number: string; plan_name: string | null },
  customerName: string,
  customMessage?: string
) {
  return {
    subject: `Your ReelFlix Credentials Are Ready!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 0;">
        <div style="background: linear-gradient(135deg, #ff1493, #8b5cf6); padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">ReelFlix</h1>
          <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Your Credentials Are Ready! 🎉</p>
        </div>
        <div style="padding: 30px;">
          <p style="margin: 0 0 20px;">Hi ${customerName},</p>
          <p style="margin: 0 0 20px;">Your <strong>${invoice.plan_name || "ReelFlix"}</strong> subscription is now active!</p>
          ${
            customMessage
              ? `<div style="background: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 3px solid #ff1493;">
                  <p style="margin: 0; white-space: pre-wrap;">${customMessage}</p>
                </div>`
              : ""
          }
          <p style="margin: 20px 0; color: #999; font-size: 13px;">
            Visit your dashboard for setup guides and app download links. Need help? Contact our support team.
          </p>
        </div>
        <div style="padding: 20px 30px; background: #1a1a1a; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">© ${new Date().getFullYear()} ReelFlix. All rights reserved.</p>
        </div>
      </div>
    `,
  };
}

// ── Main handler ─────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ ok: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    const { invoice_id, type, custom_message } = await req.json();
    if (!invoice_id || !type) {
      return new Response(
        JSON.stringify({ ok: false, error: "invoice_id and type are required" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // ── Duplicate prevention: check if same email type was already sent recently
    const { data: invoice, error: invErr } = await sb
      .from("invoices")
      .select("id, invoice_number, amount_cents, currency, plan_name, user_id, status, last_email_sent_at, last_email_type")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) {
      await logEvent("email_send_failed", "invoice", invoice_id, "fail", { type }, "Invoice not found");
      return new Response(
        JSON.stringify({ ok: false, error: "Invoice not found" }),
        { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Guard: don't send payment_confirmed for non-paid invoices
    if (type === "payment_confirmed" && invoice.status !== "paid") {
      await logEvent("email_blocked", "invoice", invoice_id, "fail", { type, invoice_status: invoice.status }, "Cannot send payment_confirmed for non-paid invoice");
      return new Response(
        JSON.stringify({ ok: false, error: "Invoice is not in paid status" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Guard: don't send credentials_sent for non-paid invoices
    if (type === "credentials_sent" && invoice.status !== "paid") {
      await logEvent("email_blocked", "invoice", invoice_id, "fail", { type, invoice_status: invoice.status }, "Cannot send credentials for non-paid invoice");
      return new Response(
        JSON.stringify({ ok: false, error: "Invoice is not in paid status" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Guard: dedup — same email type within 60 seconds
    if (invoice.last_email_type === type && invoice.last_email_sent_at) {
      const lastSent = new Date(invoice.last_email_sent_at).getTime();
      const now = Date.now();
      if (now - lastSent < 60_000) {
        console.log(`Duplicate email blocked: ${type} for ${invoice_id} (sent ${Math.round((now - lastSent) / 1000)}s ago)`);
        await logEvent("email_deduplicated", "invoice", invoice_id, "success", { type, seconds_since_last: Math.round((now - lastSent) / 1000) });
        return new Response(
          JSON.stringify({ ok: true, deduplicated: true }),
          { headers: { ...corsHeaders, "content-type": "application/json" } }
        );
      }
    }

    // Fetch profile
    const { data: profile } = await sb
      .from("profiles")
      .select("full_name, email")
      .eq("id", invoice.user_id)
      .single();

    if (!profile?.email) {
      await logEvent("email_send_failed", "invoice", invoice_id, "fail", { type }, "Customer email not found");
      return new Response(
        JSON.stringify({ ok: false, error: "Customer email not found" }),
        { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const customerName = profile.full_name || "Customer";
    let emailContent: { subject: string; html: string };

    switch (type) {
      case "invoice_created":
        emailContent = buildInvoiceCreatedEmail(invoice, customerName);
        break;
      case "payment_confirmed":
        emailContent = buildPaymentConfirmedEmail(invoice, customerName);
        break;
      case "credentials_sent":
        emailContent = buildCredentialsSentEmail(invoice, customerName, custom_message);
        break;
      default:
        return new Response(
          JSON.stringify({ ok: false, error: `Unknown email type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
        );
    }

    const emailRes = await resend.emails.send({
      from: FROM_EMAIL,
      to: [profile.email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log(`Email sent (${type}) to ${profile.email}:`, JSON.stringify(emailRes));

    // Update email tracker on invoice
    await updateEmailTracker(invoice_id, type);

    // Log email event
    await logEvent(
      "email_sent",
      "invoice",
      invoice_id,
      "success",
      { type, to: profile.email, email_id: emailRes?.data?.id }
    );

    return new Response(
      JSON.stringify({ ok: true, email_id: emailRes?.data?.id }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e) {
    console.error("Email function error:", e);
    await logEvent("email_send_failed", "system", "send-invoice-email", "fail", {}, (e as Error).message);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
