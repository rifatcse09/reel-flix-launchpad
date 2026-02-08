import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface TestResult {
  id: string;
  name: string;
  module: string;
  steps: string;
  expected: string;
  status: "pass" | "fail" | "skip";
  error?: string;
  duration_ms: number;
}

// Service-role client (bypasses RLS)
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Anon client (subject to RLS)
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const QA_TAG = "__QA_TEST__";

async function runTest(
  id: string,
  name: string,
  module: string,
  steps: string,
  expected: string,
  fn: () => Promise<void>
): Promise<TestResult> {
  const start = Date.now();
  try {
    await fn();
    return { id, name, module, steps, expected, status: "pass", duration_ms: Date.now() - start };
  } catch (e: any) {
    return { id, name, module, steps, expected, status: "fail", error: e.message, duration_ms: Date.now() - start };
  }
}

// ─── Test implementations ─────────────────────────

async function testRlsAnonCannotReadUserRoles(): Promise<void> {
  const { data, error } = await anonClient.from("user_roles").select("*").limit(1);
  // RLS should block unauthenticated reads — either error or empty
  if (data && data.length > 0) {
    throw new Error("Anon client could read user_roles — RLS is not blocking!");
  }
}

async function testRlsAnonCannotReadStaffActivity(): Promise<void> {
  const { data } = await anonClient.from("staff_activity_log").select("*").limit(1);
  if (data && data.length > 0) {
    throw new Error("Anon client could read staff_activity_log — RLS is not blocking!");
  }
}

async function testRlsAnonCannotReadSystemEventLog(): Promise<void> {
  const { data } = await anonClient.from("system_event_log").select("*").limit(1);
  if (data && data.length > 0) {
    throw new Error("Anon client could read system_event_log — RLS is not blocking!");
  }
}

async function testRlsAnonCannotReadFraudMarkers(): Promise<void> {
  const { data } = await anonClient.from("fraud_markers").select("*").limit(1);
  if (data && data.length > 0) {
    throw new Error("Anon client could read fraud_markers — RLS is not blocking!");
  }
}

async function testRlsAnonCannotReadAdminNotes(): Promise<void> {
  const { data } = await anonClient.from("admin_notes").select("*").limit(1);
  if (data && data.length > 0) {
    throw new Error("Anon client could read admin_notes — RLS is not blocking!");
  }
}

async function testRlsAnonCannotInsertSystemEventLog(): Promise<void> {
  const { error } = await anonClient.from("system_event_log").insert({
    event_type: "qa_test",
    entity_type: "test",
    entity_id: "test-123",
    status: "fail",
  });
  if (!error) {
    // Clean up if somehow it got through
    await adminClient.from("system_event_log").delete().eq("entity_id", "test-123").eq("event_type", "qa_test");
    throw new Error("Anon client could INSERT into system_event_log — RLS is not blocking!");
  }
}

async function testInvoiceStatusTransitions(): Promise<void> {
  // Create a test invoice via service role
  const { data: inv, error: createErr } = await adminClient.from("invoices").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    amount_cents: 100,
    status: "unpaid",
    notes: QA_TAG,
    plan_name: "QA Test Plan",
  }).select().single();

  if (createErr || !inv) throw new Error("Failed to create test invoice: " + createErr?.message);

  // Valid transition: unpaid → paid
  const { error: paidErr } = await adminClient.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", inv.id);
  if (paidErr) throw new Error("unpaid→paid failed: " + paidErr.message);

  // Valid transition: paid → refunded
  const { error: refundErr } = await adminClient.from("invoices").update({ status: "refunded" }).eq("id", inv.id);
  if (refundErr) throw new Error("paid→refunded failed: " + refundErr.message);

  // Clean up
  await adminClient.from("invoices").delete().eq("id", inv.id);
}

async function testInvoiceInvalidTransition(): Promise<void> {
  const { data: inv, error: createErr } = await adminClient.from("invoices").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    amount_cents: 200,
    status: "unpaid",
    notes: QA_TAG,
    plan_name: "QA Invalid Transition",
  }).select().single();

  if (createErr || !inv) throw new Error("Failed to create test invoice: " + createErr?.message);

  // First move to void (valid)
  const { error: voidErr } = await adminClient.from("invoices").update({ status: "void" }).eq("id", inv.id);
  if (voidErr) {
    await adminClient.from("invoices").delete().eq("id", inv.id);
    throw new Error("unpaid→void failed unexpectedly: " + voidErr.message);
  }

  // Invalid transition: void → paid should fail
  const { error: badErr } = await adminClient.from("invoices").update({ status: "paid" }).eq("id", inv.id);
  await adminClient.from("invoices").delete().eq("id", inv.id);

  if (!badErr) {
    throw new Error("void→paid was allowed — status transition constraint is broken!");
  }
}

async function testRetryQueueLifecycle(): Promise<void> {
  // Insert a retry item
  const { data: item, error: insertErr } = await adminClient.from("retry_queue").insert({
    operation_type: "qa_test_op",
    entity_type: "test",
    entity_id: QA_TAG,
    status: "pending",
    operation_data: { test: true },
    max_attempts: 3,
  }).select().single();

  if (insertErr || !item) throw new Error("Failed to create retry item: " + insertErr?.message);

  // Update to failed
  const { error: failErr } = await adminClient.from("retry_queue").update({
    status: "failed",
    attempts: 3,
    last_error: "QA simulated failure",
  }).eq("id", item.id);

  if (failErr) throw new Error("Failed to update retry item: " + failErr.message);

  // Resolve it
  const { error: resolveErr } = await adminClient.from("retry_queue").update({
    status: "exhausted",
    resolved_at: new Date().toISOString(),
  }).eq("id", item.id);

  if (resolveErr) throw new Error("Failed to resolve retry item: " + resolveErr.message);

  // Cleanup
  await adminClient.from("retry_queue").delete().eq("id", item.id);
}

async function testAlertCreation(): Promise<void> {
  const { data: alert, error } = await adminClient.from("operational_alerts").insert({
    alert_type: "qa_test",
    severity: "warning",
    title: QA_TAG + " Test Alert",
    message: "This is a QA smoke test alert",
    entity_type: "test",
    entity_id: QA_TAG,
  }).select().single();

  if (error || !alert) throw new Error("Failed to create alert: " + error?.message);

  // Verify it exists
  const { data: found } = await adminClient.from("operational_alerts").select("id").eq("id", alert.id).single();
  if (!found) throw new Error("Alert not found after creation");

  // Cleanup
  await adminClient.from("operational_alerts").delete().eq("id", alert.id);
}

async function testSystemEventLogWriteViaServiceRole(): Promise<void> {
  const { data, error } = await adminClient.from("system_event_log").insert({
    event_type: "qa_smoke_test",
    entity_type: "test",
    entity_id: QA_TAG,
    status: "success",
    metadata: { qa: true },
  }).select().single();

  if (error) throw new Error("Service role cannot write to system_event_log: " + error.message);

  // Cleanup
  if (data) await adminClient.from("system_event_log").delete().eq("id", data.id);
}

async function testStaffActivityLogInsert(): Promise<void> {
  // Staff activity requires an admin role — service role bypasses RLS
  const { data, error } = await adminClient.from("staff_activity_log").insert({
    admin_id: "00000000-0000-0000-0000-000000000000",
    admin_email: "qa@test.local",
    action_type: "qa_smoke_test",
    description: QA_TAG + " staff activity test",
    entity_type: "test",
    entity_id: QA_TAG,
  }).select().single();

  if (error) throw new Error("Failed to insert staff activity: " + error.message);
  if (data) await adminClient.from("staff_activity_log").delete().eq("id", data.id);
}

async function testLegalAcceptanceFlow(): Promise<void> {
  const { data, error } = await adminClient.from("legal_acceptances").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    document_type: "tos",
    document_version: "qa-1.0",
    ip_address: "127.0.0.1",
    user_agent: "QA Smoke Test",
  }).select().single();

  if (error) throw new Error("Failed to create legal acceptance: " + error.message);

  // Verify version + timestamp exist
  if (!data?.document_version || !data?.accepted_at || !data?.ip_address) {
    throw new Error("Legal acceptance missing required fields (version/timestamp/IP)");
  }

  // Cleanup
  await adminClient.from("legal_acceptances").delete().eq("id", data.id);
}

async function testReferralCodeCreateAndRead(): Promise<void> {
  const code = "QATEST" + Date.now().toString(36).toUpperCase();
  const { data, error } = await adminClient.from("referral_codes").insert({
    code,
    label: QA_TAG,
    active: true,
    discount_amount_cents: 500,
    discount_type: "both",
    plan_type: "one-year",
  }).select().single();

  if (error || !data) throw new Error("Failed to create referral code: " + error?.message);

  // Verify anon can read it (public policy)
  const { data: pub } = await anonClient.from("referral_codes").select("code").eq("id", data.id).single();
  if (!pub) throw new Error("Referral code not readable by anon — RLS policy may be wrong");

  // Cleanup
  await adminClient.from("referral_codes").delete().eq("id", data.id);
}

async function testReferralClickTracking(): Promise<void> {
  const code = "QACLK" + Date.now().toString(36).toUpperCase();
  const { data: rc, error: rcErr } = await adminClient.from("referral_codes").insert({
    code,
    label: QA_TAG,
    active: true,
  }).select().single();

  if (rcErr || !rc) throw new Error("Failed to create referral code for click test: " + rcErr?.message);

  // Record a click via service role (simulating edge function)
  const { error: clickErr } = await adminClient.from("referral_clicks").insert({
    code_id: rc.id,
    ip_address: "127.0.0.1",
    user_agent: "QA Smoke Test",
    session_id: "qa-session-" + Date.now(),
  });

  if (clickErr) throw new Error("Failed to record referral click: " + clickErr.message);

  // Verify click was recorded
  const { data: clicks } = await adminClient.from("referral_clicks").select("id").eq("code_id", rc.id);
  if (!clicks || clicks.length === 0) throw new Error("Referral click not found after insert");

  // Cleanup
  await adminClient.from("referral_clicks").delete().eq("code_id", rc.id);
  await adminClient.from("referral_codes").delete().eq("id", rc.id);
}

async function testPaymentStatusTransitions(): Promise<void> {
  // Create invoice first
  const { data: inv, error: invErr } = await adminClient.from("invoices").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    amount_cents: 999,
    status: "unpaid",
    notes: QA_TAG,
    plan_name: "QA Payment Test",
  }).select().single();
  if (invErr || !inv) throw new Error("Failed to create test invoice for payment: " + invErr?.message);

  // Create payment
  const { data: pmt, error: pmtErr } = await adminClient.from("payments").insert({
    invoice_id: inv.id,
    user_id: "00000000-0000-0000-0000-000000000000",
    status: "pending",
    method: "crypto",
    provider: "qa_test",
    currency: "USD",
  }).select().single();
  if (pmtErr || !pmt) {
    await adminClient.from("invoices").delete().eq("id", inv.id);
    throw new Error("Failed to create test payment: " + pmtErr?.message);
  }

  // Valid transition: pending → confirmed
  const { error: confirmErr } = await adminClient.from("payments").update({
    status: "confirmed",
    received_at: new Date().toISOString(),
  }).eq("id", pmt.id);
  if (confirmErr) {
    await adminClient.from("payments").delete().eq("id", pmt.id);
    await adminClient.from("invoices").delete().eq("id", inv.id);
    throw new Error("pending→confirmed failed: " + confirmErr.message);
  }

  // Cleanup
  await adminClient.from("payments").delete().eq("id", pmt.id);
  await adminClient.from("fulfillment").delete().eq("invoice_id", inv.id);
  await adminClient.from("invoices").delete().eq("id", inv.id);
}

async function testCreditCreation(): Promise<void> {
  const { data, error } = await adminClient.from("account_credits").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    amount_cents: 500,
    reason: QA_TAG + " credit test",
    source_type: "manual",
  }).select().single();

  if (error || !data) throw new Error("Failed to create credit: " + error?.message);

  // Verify
  if (data.amount_cents !== 500) throw new Error("Credit amount mismatch");

  // Cleanup
  await adminClient.from("account_credits").delete().eq("id", data.id);
}

async function testServiceStatusWidgets(): Promise<void> {
  // Verify backup_status table is accessible
  const { error: bErr } = await adminClient.from("backup_status").select("id").limit(1);
  if (bErr) throw new Error("backup_status table not accessible: " + bErr.message);

  // Verify SLA targets
  const { error: sErr } = await adminClient.from("sla_targets").select("id").limit(1);
  if (sErr) throw new Error("sla_targets table not accessible: " + sErr.message);

  // Verify incidents
  const { error: iErr } = await adminClient.from("incidents").select("id").limit(1);
  if (iErr) throw new Error("incidents table not accessible: " + iErr.message);
}

async function testNowPaymentsWebhookSimulation(): Promise<void> {
  // Create a test invoice to receive webhook
  const { data: inv, error: invErr } = await adminClient.from("invoices").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    amount_cents: 1500,
    status: "unpaid",
    notes: QA_TAG,
    plan_name: "QA Webhook Test",
  }).select().single();
  if (invErr || !inv) throw new Error("Failed to create webhook test invoice: " + invErr?.message);

  // Create a pending payment for this invoice
  const { data: pmt, error: pmtErr } = await adminClient.from("payments").insert({
    invoice_id: inv.id,
    user_id: "00000000-0000-0000-0000-000000000000",
    status: "pending",
    method: "crypto",
    provider: "nowpayments",
    currency: "USD",
  }).select().single();
  if (pmtErr || !pmt) {
    await adminClient.from("invoices").delete().eq("id", inv.id);
    throw new Error("Failed to create webhook test payment: " + pmtErr?.message);
  }

  // Simulate webhook call to the edge function
  const webhookPayload = {
    payment_id: 99999999,
    payment_status: "finished",
    order_id: inv.id,
    actually_paid: "15.00",
    pay_currency: "USDTTRC20",
    payin_hash: "qa_test_hash_" + Date.now(),
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/nowpayments-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Webhook returned ${res.status}: ${text}`);
    }
    await res.text();

    // Verify payment was updated
    const { data: updatedPmt } = await adminClient.from("payments").select("status").eq("id", pmt.id).single();
    if (updatedPmt?.status !== "confirmed") {
      throw new Error(`Payment status should be 'confirmed' but is '${updatedPmt?.status}'`);
    }
  } finally {
    // Cleanup
    await adminClient.from("payments").delete().eq("id", pmt.id);
    await adminClient.from("fulfillment").delete().eq("invoice_id", inv.id);
    await adminClient.from("invoices").delete().eq("id", inv.id);
    // Clean webhook log entries
    await adminClient.from("system_event_log").delete().eq("entity_id", inv.id).eq("event_type", "nowpayments_webhook_received");
  }
}

async function testEdgeFunctionReachability(): Promise<void> {
  const functions = ["check-alerts", "track-referral-click", "validate-trial-signup", "nowpayments-webhook"];
  const unreachable: string[] = [];

  for (const fn of functions) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, { method: "OPTIONS" });
      await res.text();
      if (!res.ok && res.status !== 204) unreachable.push(fn);
    } catch {
      unreachable.push(fn);
    }
  }

  if (unreachable.length > 0) {
    throw new Error(`Unreachable functions: ${unreachable.join(", ")}`);
  }
}

async function testRbacPermissionMatrix(): Promise<void> {
  // Verify the has_role and has_any_admin_role functions exist by calling them
  const { error: e1 } = await adminClient.rpc("has_role", {
    _user_id: "00000000-0000-0000-0000-000000000000",
    _role: "admin",
  });
  if (e1) throw new Error("has_role function error: " + e1.message);

  const { error: e2 } = await adminClient.rpc("has_any_admin_role", {
    _user_id: "00000000-0000-0000-0000-000000000000",
  });
  if (e2) throw new Error("has_any_admin_role function error: " + e2.message);

  const { error: e3 } = await adminClient.rpc("get_admin_role", {
    _user_id: "00000000-0000-0000-0000-000000000000",
  });
  if (e3) throw new Error("get_admin_role function error: " + e3.message);
}

// ─── Test data generation ──────────────────────────

async function generateTestData(): Promise<{ created: string[] }> {
  const created: string[] = [];

  // 1. Test referral code
  const { data: rc } = await adminClient.from("referral_codes").insert({
    code: "QATEST2026",
    label: QA_TAG,
    active: true,
    discount_amount_cents: 1000,
    discount_type: "both",
    plan_type: "one-year",
    trial_hours: 24,
  }).select().single();
  if (rc) created.push(`referral_code:${rc.id}`);

  // 2. Test alert
  const { data: alert } = await adminClient.from("operational_alerts").insert({
    alert_type: "qa_test",
    severity: "info",
    title: QA_TAG + " Sandbox Alert",
    message: "Generated by QA Mode for testing",
    entity_type: "test",
    entity_id: QA_TAG,
  }).select().single();
  if (alert) created.push(`alert:${alert.id}`);

  // 3. Test retry queue item
  const { data: retry } = await adminClient.from("retry_queue").insert({
    operation_type: "qa_sandbox",
    entity_type: "test",
    entity_id: QA_TAG,
    status: "pending",
    operation_data: { sandbox: true },
    max_attempts: 5,
  }).select().single();
  if (retry) created.push(`retry:${retry.id}`);

  // 4. Test invoice
  const { data: inv } = await adminClient.from("invoices").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    amount_cents: 4999,
    status: "unpaid",
    notes: QA_TAG,
    plan_name: "QA Sandbox Plan",
  }).select().single();
  if (inv) created.push(`invoice:${inv.id}`);

  // 5. Test incident
  const { data: incident } = await adminClient.from("incidents").insert({
    title: QA_TAG + " Test Incident",
    description: "Generated by QA Mode",
    severity: "low",
    status: "investigating",
    created_by: "00000000-0000-0000-0000-000000000000",
  }).select().single();
  if (incident) created.push(`incident:${incident.id}`);

  return { created };
}

async function deleteTestData(): Promise<{ deleted: string[] }> {
  const deleted: string[] = [];

  // Delete all QA-tagged data
  const tables: { table: string; column: string; value: string }[] = [
    { table: "referral_clicks", column: "session_id", value: "qa-session-%" },
    { table: "operational_alerts", column: "entity_id", value: QA_TAG },
    { table: "retry_queue", column: "entity_id", value: QA_TAG },
    { table: "staff_activity_log", column: "entity_id", value: QA_TAG },
    { table: "system_event_log", column: "entity_id", value: QA_TAG },
    { table: "legal_acceptances", column: "document_version", value: "qa-1.0" },
    { table: "account_credits", column: "reason", value: QA_TAG + "%" },
  ];

  for (const t of tables) {
    const { count, error } = await adminClient
      .from(t.table as any)
      .delete({ count: "exact" })
      .like(t.column, t.value);
    if (!error && (count ?? 0) > 0) deleted.push(`${t.table}: ${count} rows`);
  }

  // QA tagged referral codes (also delete related clicks/uses first)
  const { data: qaCodes } = await adminClient.from("referral_codes").select("id").eq("label", QA_TAG);
  if (qaCodes && qaCodes.length > 0) {
    const ids = qaCodes.map((c: any) => c.id);
    await adminClient.from("referral_clicks").delete().in("code_id", ids);
    await adminClient.from("referral_uses").delete().in("code_id", ids);
    const { count } = await adminClient.from("referral_codes").delete({ count: "exact" }).eq("label", QA_TAG);
    if ((count ?? 0) > 0) deleted.push(`referral_codes: ${count} rows`);
  }

  // QA invoices (and related payments/fulfillment)
  const { data: qaInvoices } = await adminClient.from("invoices").select("id").eq("notes", QA_TAG);
  if (qaInvoices && qaInvoices.length > 0) {
    const ids = qaInvoices.map((i: any) => i.id);
    await adminClient.from("payments").delete().in("invoice_id", ids);
    await adminClient.from("fulfillment").delete().in("invoice_id", ids);
    const { count } = await adminClient.from("invoices").delete({ count: "exact" }).eq("notes", QA_TAG);
    if ((count ?? 0) > 0) deleted.push(`invoices: ${count} rows`);
  }

  // QA incidents
  const { count: incCount } = await adminClient.from("incidents").delete({ count: "exact" }).like("title", QA_TAG + "%");
  if ((incCount ?? 0) > 0) deleted.push(`incidents: ${incCount} rows`);

  return { deleted };
}

// ─── Main handler ──────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super_admin role
    const { data: isSuperAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "super_admin",
    });

    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Requires super_admin role" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action || "run_tests";

    if (action === "generate_test_data") {
      const result = await generateTestData();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_test_data") {
      const result = await deleteTestData();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Run tests
    const selectedTests: string[] | undefined = body.tests;

    const allTests = [
      { id: "rls_user_roles", fn: () => runTest("rls_user_roles", "RLS: Anon cannot read user_roles", "RLS", "Query user_roles as anon client", "Empty result or error", testRlsAnonCannotReadUserRoles) },
      { id: "rls_staff_activity", fn: () => runTest("rls_staff_activity", "RLS: Anon cannot read staff_activity_log", "RLS", "Query staff_activity_log as anon client", "Empty result or error", testRlsAnonCannotReadStaffActivity) },
      { id: "rls_system_event_log", fn: () => runTest("rls_system_event_log", "RLS: Anon cannot read system_event_log", "RLS", "Query system_event_log as anon client", "Empty result or error", testRlsAnonCannotReadSystemEventLog) },
      { id: "rls_fraud_markers", fn: () => runTest("rls_fraud_markers", "RLS: Anon cannot read fraud_markers", "RLS", "Query fraud_markers as anon client", "Empty result or error", testRlsAnonCannotReadFraudMarkers) },
      { id: "rls_admin_notes", fn: () => runTest("rls_admin_notes", "RLS: Anon cannot read admin_notes", "RLS", "Query admin_notes as anon client", "Empty result or error", testRlsAnonCannotReadAdminNotes) },
      { id: "rls_insert_syslog", fn: () => runTest("rls_insert_syslog", "RLS: Anon cannot INSERT system_event_log", "RLS", "Insert into system_event_log as anon client", "Insert blocked by RLS", testRlsAnonCannotInsertSystemEventLog) },
      { id: "rbac_functions", fn: () => runTest("rbac_functions", "RBAC: Permission check functions exist", "RBAC", "Call has_role, has_any_admin_role, get_admin_role RPCs", "All functions return without error", testRbacPermissionMatrix) },
      { id: "invoice_transitions", fn: () => runTest("invoice_transitions", "Invoice valid status transitions", "Invoices", "Create invoice, transition unpaid→paid→refunded", "All transitions succeed", testInvoiceStatusTransitions) },
      { id: "invoice_invalid_transition", fn: () => runTest("invoice_invalid_transition", "Invoice invalid transition blocked", "Invoices", "Create invoice, void it, then try void→paid", "Transition rejected by trigger", testInvoiceInvalidTransition) },
      { id: "payment_transitions", fn: () => runTest("payment_transitions", "Payment status transitions", "Payments", "Create payment, transition pending→confirmed", "Transition succeeds", testPaymentStatusTransitions) },
      { id: "webhook_simulation", fn: () => runTest("webhook_simulation", "NowPayments webhook simulation", "Payments", "Create invoice+payment, POST webhook payload, verify confirmed", "Payment status becomes confirmed", testNowPaymentsWebhookSimulation) },
      { id: "retry_lifecycle", fn: () => runTest("retry_lifecycle", "Retry queue lifecycle", "Retry Queue", "Insert item, mark failed, exhaust, resolve", "All state changes succeed", testRetryQueueLifecycle) },
      { id: "alert_creation", fn: () => runTest("alert_creation", "Alert creation and verification", "Alerts", "Insert alert, verify it exists, cleanup", "Alert persisted correctly", testAlertCreation) },
      { id: "syslog_service_role", fn: () => runTest("syslog_service_role", "System event log write (service role)", "Audit", "Insert into system_event_log via service role", "Insert succeeds", testSystemEventLogWriteViaServiceRole) },
      { id: "staff_activity_insert", fn: () => runTest("staff_activity_insert", "Staff activity log insert", "Audit", "Insert into staff_activity_log via service role", "Insert succeeds", testStaffActivityLogInsert) },
      { id: "legal_acceptance", fn: () => runTest("legal_acceptance", "Legal acceptance flow", "Legal", "Insert legal acceptance with version/IP, verify fields", "Record stored with version, timestamp, IP", testLegalAcceptanceFlow) },
      { id: "referral_create", fn: () => runTest("referral_create", "Referral code create and public read", "Referrals", "Create referral code, read as anon", "Code readable publicly", testReferralCodeCreateAndRead) },
      { id: "referral_click", fn: () => runTest("referral_click", "Referral click tracking", "Referrals", "Create code, insert click, verify recorded", "Click persisted with session", testReferralClickTracking) },
      { id: "credit_creation", fn: () => runTest("credit_creation", "Account credit creation", "Credits", "Create credit, verify amount", "Credit persisted correctly", testCreditCreation) },
      { id: "service_status", fn: () => runTest("service_status", "Service status widgets accessible", "Service Status", "Query backup_status, sla_targets, incidents", "All tables accessible", testServiceStatusWidgets) },
      { id: "edge_fn_reachability", fn: () => runTest("edge_fn_reachability", "Edge function CORS reachability", "Edge Functions", "OPTIONS request to critical functions", "All return 2xx", testEdgeFunctionReachability) },
    ];

    const testsToRun = selectedTests
      ? allTests.filter((t) => selectedTests.includes(t.id))
      : allTests;

    const results: TestResult[] = [];
    for (const test of testsToRun) {
      results.push(await test.fn());
    }

    return new Response(JSON.stringify({ results, ran_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("QA smoke test error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
