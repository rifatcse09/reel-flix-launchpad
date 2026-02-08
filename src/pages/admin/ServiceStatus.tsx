import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, RefreshCw, Wifi, Mail, Truck, AlertTriangle,
  Server, Clock, CheckCircle2, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { subHours, subDays, format } from "date-fns";
import { ServiceStatusCard } from "@/components/admin/ServiceStatusCard";
import { ServiceUptimeChart } from "@/components/admin/ServiceUptimeChart";

export interface ServiceMetric {
  id: string;
  label: string;
  icon: React.ElementType;
  status: "operational" | "degraded" | "outage";
  value: string;
  detail: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
}

const ServiceStatus = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [services, setServices] = useState<ServiceMetric[]>([]);
  const [uptimeData, setUptimeData] = useState<{ hour: string; ok: number; fail: number }[]>([]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/dashboard/profile");
  }, [isAdmin, adminLoading, navigate]);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const h1 = subHours(now, 1).toISOString();
      const h24 = subHours(now, 24).toISOString();
      const d7 = subDays(now, 7).toISOString();

      // Parallel queries
      const [eventsRes, retryRes, fulfillmentRes, invoicesRes, events24Res] = await Promise.all([
        supabase
          .from("system_event_log")
          .select("id, event_type, status, created_at, metadata")
          .gte("created_at", h24)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("retry_queue")
          .select("id, status, operation_type, created_at")
          .in("status", ["pending", "retrying"]),
        supabase
          .from("fulfillment")
          .select("id, status, created_at")
          .eq("status", "pending_manual_provisioning"),
        supabase
          .from("invoices")
          .select("id, status, created_at")
          .eq("status", "unpaid")
          .lt("created_at", h1),
        supabase
          .from("system_event_log")
          .select("id, event_type, status, created_at")
          .gte("created_at", d7)
          .order("created_at", { ascending: true })
          .limit(1000),
      ]);

      const events = eventsRes.data || [];
      const retryItems = retryRes.data || [];
      const pendingFulfillment = fulfillmentRes.data || [];
      const stuckInvoices = invoicesRes.data || [];
      const events7d = events24Res.data || [];

      // -- Webhook Latency & Status --
      const webhookEvents = events.filter(e => e.event_type.includes("webhook"));
      const webhookFails = webhookEvents.filter(e => e.status === "fail").length;
      const webhookTotal = webhookEvents.length;
      const webhookFailRate = webhookTotal > 0 ? (webhookFails / webhookTotal) * 100 : 0;
      const webhookStatus: "operational" | "degraded" | "outage" =
        webhookFailRate > 20 ? "outage" : webhookFailRate > 5 ? "degraded" : "operational";

      // -- Queue Depth --
      const queueDepth = retryItems.length;
      const queueStatus: "operational" | "degraded" | "outage" =
        queueDepth > 20 ? "outage" : queueDepth > 5 ? "degraded" : "operational";

      // -- Failure Rate (all events) --
      const totalEvents = events.length;
      const failedEvents = events.filter(e => e.status === "fail").length;
      const failureRate = totalEvents > 0 ? (failedEvents / totalEvents) * 100 : 0;
      const failureStatus: "operational" | "degraded" | "outage" =
        failureRate > 10 ? "outage" : failureRate > 3 ? "degraded" : "operational";

      // -- Email Performance --
      const emailEvents = events.filter(e => e.event_type.includes("email"));
      const emailFails = emailEvents.filter(e => e.status === "fail").length;
      const emailTotal = emailEvents.length;
      const emailSuccessRate = emailTotal > 0 ? ((emailTotal - emailFails) / emailTotal) * 100 : 100;
      const emailStatus: "operational" | "degraded" | "outage" =
        emailSuccessRate < 80 ? "outage" : emailSuccessRate < 95 ? "degraded" : "operational";

      // -- API / System Uptime (based on event success rate over 7d) --
      const total7d = events7d.length;
      const fail7d = events7d.filter(e => e.status === "fail").length;
      const uptimePercent = total7d > 0 ? ((total7d - fail7d) / total7d) * 100 : 100;
      const uptimeStatus: "operational" | "degraded" | "outage" =
        uptimePercent < 95 ? "outage" : uptimePercent < 99 ? "degraded" : "operational";

      // -- Fulfillment Pipeline --
      const fulfillmentPending = pendingFulfillment.length;
      const fulfillmentStatus: "operational" | "degraded" | "outage" =
        fulfillmentPending > 10 ? "outage" : fulfillmentPending > 3 ? "degraded" : "operational";

      setServices([
        {
          id: "webhook",
          label: "Webhook Processing",
          icon: Wifi,
          status: webhookStatus,
          value: `${webhookFailRate.toFixed(1)}% fail`,
          detail: `${webhookFails}/${webhookTotal} failed (24h)`,
          trend: webhookFails > 0 ? "down" : "flat",
          trendValue: `${webhookTotal} processed`,
        },
        {
          id: "queue",
          label: "Retry Queue",
          icon: Clock,
          status: queueStatus,
          value: `${queueDepth} pending`,
          detail: `${retryItems.filter(r => r.status === "retrying").length} actively retrying`,
          trend: queueDepth > 0 ? "down" : "flat",
          trendValue: `${queueDepth} items`,
        },
        {
          id: "failure",
          label: "Overall Failure Rate",
          icon: AlertTriangle,
          status: failureStatus,
          value: `${failureRate.toFixed(1)}%`,
          detail: `${failedEvents}/${totalEvents} events failed (24h)`,
          trend: failedEvents > 0 ? "down" : "up",
          trendValue: `${totalEvents} total events`,
        },
        {
          id: "email",
          label: "Email Delivery",
          icon: Mail,
          status: emailStatus,
          value: `${emailSuccessRate.toFixed(1)}% success`,
          detail: `${emailTotal - emailFails}/${emailTotal} delivered (24h)`,
          trend: emailFails > 0 ? "down" : "up",
          trendValue: `${emailTotal} sent`,
        },
        {
          id: "uptime",
          label: "System Uptime",
          icon: Server,
          status: uptimeStatus,
          value: `${uptimePercent.toFixed(2)}%`,
          detail: `${total7d - fail7d}/${total7d} successful (7d)`,
          trend: uptimePercent >= 99.5 ? "up" : "down",
          trendValue: "7-day window",
        },
        {
          id: "fulfillment",
          label: "Fulfillment Pipeline",
          icon: Truck,
          status: fulfillmentStatus,
          value: `${fulfillmentPending} pending`,
          detail: `${stuckInvoices.length} stuck invoices`,
          trend: fulfillmentPending > 0 ? "down" : "flat",
          trendValue: `${fulfillmentPending + stuckInvoices.length} items`,
        },
      ]);

      // Build hourly uptime chart (last 24h)
      const hourlyBuckets: Record<string, { ok: number; fail: number }> = {};
      for (let i = 23; i >= 0; i--) {
        const hour = subHours(now, i);
        const key = format(hour, "HH:00");
        hourlyBuckets[key] = { ok: 0, fail: 0 };
      }
      events.forEach(e => {
        const key = format(new Date(e.created_at), "HH:00");
        if (hourlyBuckets[key]) {
          if (e.status === "fail") {
            hourlyBuckets[key].fail++;
          } else {
            hourlyBuckets[key].ok++;
          }
        }
      });
      setUptimeData(
        Object.entries(hourlyBuckets).map(([hour, data]) => ({
          hour,
          ok: data.ok,
          fail: data.fail,
        }))
      );

      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to load service status:", err);
      toast({ title: "Error", description: "Failed to load service status.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadMetrics();
  }, [isAdmin, loadMetrics]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(loadMetrics, 60000);
    return () => clearInterval(interval);
  }, [isAdmin, loadMetrics]);

  const overallStatus = services.some(s => s.status === "outage")
    ? "outage"
    : services.some(s => s.status === "degraded")
    ? "degraded"
    : "operational";

  const operationalCount = services.filter(s => s.status === "operational").length;

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Server className="h-8 w-8 text-primary" />
            Service Status
          </h1>
          <p className="text-muted-foreground">
            Real-time health overview of all platform services
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={overallStatus} />
          <Button variant="outline" onClick={loadMetrics} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <Card className={`border ${
        overallStatus === "outage"
          ? "border-red-500/30 bg-red-500/5"
          : overallStatus === "degraded"
          ? "border-yellow-500/30 bg-yellow-500/5"
          : "border-green-500/30 bg-green-500/5"
      }`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full animate-pulse ${
                overallStatus === "outage" ? "bg-red-500" :
                overallStatus === "degraded" ? "bg-yellow-500" : "bg-green-500"
              }`} />
              <span className="text-lg font-semibold">
                {overallStatus === "outage"
                  ? "Service Disruption Detected"
                  : overallStatus === "degraded"
                  ? "Some Services Degraded"
                  : "All Systems Operational"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{operationalCount}/{services.length} services healthy</span>
              <span>Updated {format(lastRefresh, "HH:mm:ss")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(service => (
            <ServiceStatusCard key={service.id} service={service} />
          ))}
        </div>
      )}

      {/* Hourly Activity Chart */}
      <ServiceUptimeChart data={uptimeData} loading={loading} />
    </div>
  );
};

function StatusBadge({ status }: { status: "operational" | "degraded" | "outage" }) {
  const config = {
    operational: { label: "✓ ALL OPERATIONAL", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    degraded: { label: "⚡ DEGRADED", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    outage: { label: "⚠️ OUTAGE", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const c = config[status];
  return <Badge className={`px-3 py-1 text-sm ${c.className}`}>{c.label}</Badge>;
}

export default ServiceStatus;
