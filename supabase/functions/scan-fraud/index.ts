import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_any_admin_role", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = {
      multi_account_ip: 0,
      repeated_failed_payments: 0,
      abnormal_signup_velocity: 0,
      total_markers_created: 0,
    };

    // 1. Multi-account same IP detection
    // Find IPs used by multiple users (from user_sessions)
    const { data: sessions } = await supabase
      .from("user_sessions")
      .select("user_id, ip_address")
      .not("ip_address", "is", null);

    if (sessions) {
      const ipUsers = new Map<string, Set<string>>();
      sessions.forEach((s: { user_id: string; ip_address: string | null }) => {
        if (!s.ip_address) return;
        const existing = ipUsers.get(s.ip_address) || new Set();
        existing.add(s.user_id);
        ipUsers.set(s.ip_address, existing);
      });

      for (const [ip, userIds] of ipUsers.entries()) {
        if (userIds.size >= 3) {
          const userIdArray = Array.from(userIds);
          for (const uid of userIdArray) {
            // Check if marker already exists
            const { data: existing } = await supabase
              .from("fraud_markers")
              .select("id")
              .eq("user_id", uid)
              .eq("marker_type", "multi_account_ip")
              .is("resolved_at", null)
              .limit(1);

            if (!existing || existing.length === 0) {
              await supabase.from("fraud_markers").insert({
                user_id: uid,
                marker_type: "multi_account_ip",
                severity: userIds.size >= 5 ? "high" : "medium",
                description: `IP ${ip} shared with ${userIds.size - 1} other accounts`,
                metadata: { ip, shared_user_count: userIds.size, user_ids: userIdArray },
              });
              results.multi_account_ip++;
              results.total_markers_created++;
            }
          }
        }
      }
    }

    // 2. Repeated failed payments
    const { data: failedPayments } = await supabase
      .from("payments")
      .select("user_id")
      .eq("status", "failed");

    if (failedPayments) {
      const failCountByUser = new Map<string, number>();
      failedPayments.forEach((p: { user_id: string }) => {
        failCountByUser.set(p.user_id, (failCountByUser.get(p.user_id) || 0) + 1);
      });

      for (const [uid, count] of failCountByUser.entries()) {
        if (count >= 3) {
          const { data: existing } = await supabase
            .from("fraud_markers")
            .select("id")
            .eq("user_id", uid)
            .eq("marker_type", "repeated_failed_payments")
            .is("resolved_at", null)
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabase.from("fraud_markers").insert({
              user_id: uid,
              marker_type: "repeated_failed_payments",
              severity: count >= 5 ? "high" : "medium",
              description: `${count} failed payment attempts detected`,
              metadata: { failed_count: count },
            });
            results.repeated_failed_payments++;
            results.total_markers_created++;
          }
        }
      }
    }

    // 3. Abnormal signup velocity (>5 accounts created in same hour from same IP via trial_ip_usage)
    const { data: trialIps } = await supabase
      .from("trial_ip_usage")
      .select("user_id, ip_address, created_at");

    if (trialIps) {
      const ipHourBuckets = new Map<string, Set<string>>();
      trialIps.forEach((t: { user_id: string; ip_address: string; created_at: string }) => {
        const hour = t.created_at.slice(0, 13); // YYYY-MM-DDTHH
        const key = `${t.ip_address}|${hour}`;
        const existing = ipHourBuckets.get(key) || new Set();
        existing.add(t.user_id);
        ipHourBuckets.set(key, existing);
      });

      for (const [key, userIds] of ipHourBuckets.entries()) {
        if (userIds.size >= 3) {
          const [ip] = key.split("|");
          const userIdArray = Array.from(userIds);
          for (const uid of userIdArray) {
            const { data: existing } = await supabase
              .from("fraud_markers")
              .select("id")
              .eq("user_id", uid)
              .eq("marker_type", "abnormal_signup_velocity")
              .is("resolved_at", null)
              .limit(1);

            if (!existing || existing.length === 0) {
              await supabase.from("fraud_markers").insert({
                user_id: uid,
                marker_type: "abnormal_signup_velocity",
                severity: userIds.size >= 5 ? "critical" : "high",
                description: `${userIds.size} signups from IP ${ip} within 1 hour`,
                metadata: { ip, signup_count: userIds.size, user_ids: userIdArray },
              });
              results.abnormal_signup_velocity++;
              results.total_markers_created++;
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fraud scan error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
