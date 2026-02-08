import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, RefreshCw, HeartPulse, AlertTriangle, Mail,
  Clock, CheckCircle2, XCircle, Webhook, ChevronDown,
  ChevronRight, ExternalLink, Zap
} from "lucide-react";
import { format, formatDistanceToNow, subDays, subHours } from "date-fns";

interface HealthMetric {
  label: string;
  value24h: number;
  value7d: number;
  severity: "ok" | "warn" | "critical";
}

interface StuckItem {
  id: string;
  type: "invoice" | "fulfillment";
  identifier: string;
  status: string;
  stuck_since: string;
  hours_stuck: number;
  customer_name: string | null;
  customer_email: string | null;
}

interface EventLogEntry {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  status: string;
  error_message: string | null;
  created_at: string;
}

const SystemHealth = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [stuckItems, setStuckItems] = useState<StuckItem[]>([]);
  const [failedEvents, setFailedEvents] = useState<EventLogEntry[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    metrics: true,
    stuck: true,
    failures: true,
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/dashboard/profile");
  }, [isAdmin, adminLoading, navigate]);

  const loadHealthData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const h24 = subHours(now, 24).toISOString();
      const d7 = subDays(now, 7).toISOString();

      // Fetch all event log failures
      const { data: allEvents } = await supabase
        .from("system_event_log")
        .select("id, event_type, entity_type, entity_id, metadata, status, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      const events = (allEvents || []) as EventLogEntry[];

      // Calculate metrics
      const webhookFails24h = events.filter(
        (e) => e.status === "fail" && e.event_type.includes("webhook") && new Date(e.created_at) >= new Date(h24)
      ).length;
      const webhookFails7d = events.filter(
        (e) => e.status === "fail" && e.event_type.includes("webhook") && new Date(e.created_at) >= new Date(d7)
      ).length;

      const triggerFails24h = events.filter(
        (e) =>
          e.status === "fail" &&
          (e.event_type.includes("status_changed") || e.event_type.includes("fulfillment") || e.event_type.includes("invoice")) &&
          !e.event_type.includes("webhook") &&
          !e.event_type.includes("email") &&
          new Date(e.created_at) >= new Date(h24)
      ).length;
      const triggerFails7d = events.filter(
        (e) =>
          e.status === "fail" &&
          (e.event_type.includes("status_changed") || e.event_type.includes("fulfillment") || e.event_type.includes("invoice")) &&
          !e.event_type.includes("webhook") &&
          !e.event_type.includes("email") &&
          new Date(e.created_at) >= new Date(d7)
      ).length;

      const emailFails24h = events.filter(
        (e) => e.status === "fail" && e.event_type.includes("email") && new Date(e.created_at) >= new Date(h24)
      ).length;
      const emailFails7d = events.filter(
        (e) => e.status === "fail" && e.event_type.includes("email") && new Date(e.created_at) >= new Date(d7)
      ).length;

      setMetrics([
        {
          label: "Webhook Failures",
          value24h: webhookFails24h,
          value7d: webhookFails7d,
          severity: webhookFails24h > 5 ? "critical" : webhookFails24h > 0 ? "warn" : "ok",
        },
        {
          label: "Trigger/DB Failures",
          value24h: triggerFails24h,
          value7d: triggerFails7d,
          severity: triggerFails24h > 3 ? "critical" : triggerFails24h > 0 ? "warn" : "ok",
        },
        {
          label: "Email Send Failures",
          value24h: emailFails24h,
          value7d: emailFails7d,
          severity: emailFails24h > 3 ? "critical" : emailFails24h > 0 ? "warn" : "ok",
        },
      ]);

      // Set recent failures for drilldown
      const recentFailures = events
        .filter((e) => e.status === "fail" && new Date(e.created_at) >= new Date(d7))
        .slice(0, 50);
      setFailedEvents(recentFailures);

      // Fetch stuck invoices (unpaid > 24h)
      const { data: stuckInvoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, created_at, user_id")
        .eq("status", "unpaid")
        .lt("created_at", h24)
        .order("created_at", { ascending: true })
        .limit(20);

      // Fetch stuck fulfillment (pending > 12h)
      const h12 = subHours(now, 12).toISOString();
      const { data: stuckFulfillment } = await supabase
        .from("fulfillment")
        .select("id, invoice_id, status, created_at, user_id")
        .eq("status", "pending_manual_provisioning")
        .lt("created_at", h12)
        .order("created_at", { ascending: true })
        .limit(20);

      // Get profiles for stuck items
      const userIds = [
        ...(stuckInvoices || []).map((i) => i.user_id),
        ...(stuckFulfillment || []).map((f) => f.user_id),
      ];
      const uniqueUserIds = [...new Set(userIds)];
      let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", uniqueUserIds);
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map((p) => [p.id, { full_name: p.full_name, email: p.email }]));
        }
      }

      // Get invoice numbers for stuck fulfillment
      const fulfillmentInvoiceIds = (stuckFulfillment || []).map((f) => f.invoice_id);
      let invoiceMap: Record<string, string> = {};
      if (fulfillmentInvoiceIds.length > 0) {
        const { data: invoices } = await supabase
          .from("invoices")
          .select("id, invoice_number")
          .in("id", fulfillmentInvoiceIds);
        if (invoices) {
          invoiceMap = Object.fromEntries(invoices.map((inv) => [inv.id, inv.invoice_number]));
        }
      }

      const stuck: StuckItem[] = [
        ...(stuckInvoices || []).map((inv) => ({
          id: inv.id,
          type: "invoice" as const,
          identifier: inv.invoice_number,
          status: inv.status,
          stuck_since: inv.created_at,
          hours_stuck: Math.round((now.getTime() - new Date(inv.created_at).getTime()) / 3600000),
          customer_name: profilesMap[inv.user_id]?.full_name || null,
          customer_email: profilesMap[inv.user_id]?.email || null,
        })),
        ...(stuckFulfillment || []).map((ful) => ({
          id: ful.id,
          type: "fulfillment" as const,
          identifier: invoiceMap[ful.invoice_id] || ful.invoice_id.slice(0, 8),
          status: ful.status,
          stuck_since: ful.created_at,
          hours_stuck: Math.round((now.getTime() - new Date(ful.created_at).getTime()) / 3600000),
          customer_name: profilesMap[ful.user_id]?.full_name || null,
          customer_email: profilesMap[ful.user_id]?.email || null,
        })),
      ];

      setStuckItems(stuck);
    } catch (err) {
      console.error("Failed to load health data:", err);
      toast({ title: "Error", description: "Failed to load system health data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadHealthData();
  }, [isAdmin, loadHealthData]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-400 border-red-500/30 bg-red-500/10";
      case "warn":
        return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
      default:
        return "text-green-400 border-green-500/30 bg-green-500/10";
    }
  };

  const overallHealth = metrics.some((m) => m.severity === "critical")
    ? "critical"
    : metrics.some((m) => m.severity === "warn") || stuckItems.length > 0
    ? "warn"
    : "ok";

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
            <HeartPulse className="h-8 w-8 text-primary" />
            System Health
          </h1>
          <p className="text-muted-foreground">
            Real-time monitoring of webhooks, triggers, emails, and stuck items
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={`px-3 py-1 text-sm ${
              overallHealth === "critical"
                ? "bg-red-500/20 text-red-400 border-red-500/30"
                : overallHealth === "warn"
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                : "bg-green-500/20 text-green-400 border-green-500/30"
            }`}
          >
            {overallHealth === "critical" ? "⚠️ CRITICAL" : overallHealth === "warn" ? "⚡ ATTENTION" : "✓ HEALTHY"}
          </Badge>
          <Button variant="outline" onClick={loadHealthData} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("metrics")}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-yellow-400" />
            Failure Metrics
            {expandedSections.metrics ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
          </CardTitle>
        </CardHeader>
        {expandedSections.metrics && (
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {metrics.map((m) => (
                  <div key={m.label} className={`border rounded-lg p-4 ${getSeverityColor(m.severity)}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {m.label.includes("Webhook") ? (
                        <Webhook className="h-4 w-4" />
                      ) : m.label.includes("Email") ? (
                        <Mail className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">{m.label}</span>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div>
                        <span className="text-2xl font-bold">{m.value24h}</span>
                        <span className="text-xs ml-1 opacity-70">24h</span>
                      </div>
                      <div>
                        <span className="text-lg font-semibold">{m.value7d}</span>
                        <span className="text-xs ml-1 opacity-70">7d</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Stuck Items */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("stuck")}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-orange-400" />
            Stuck Items
            {stuckItems.length > 0 && (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 ml-2">
                {stuckItems.length}
              </Badge>
            )}
            {expandedSections.stuck ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
          </CardTitle>
          <CardDescription>Invoices unpaid &gt;24h · Fulfillment pending &gt;12h</CardDescription>
        </CardHeader>
        {expandedSections.stuck && (
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : stuckItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-400/50" />
                <p className="text-sm">No stuck items. Everything is moving smoothly.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="h-9">Type</TableHead>
                      <TableHead className="h-9">Identifier</TableHead>
                      <TableHead className="h-9">Customer</TableHead>
                      <TableHead className="h-9">Status</TableHead>
                      <TableHead className="h-9">Stuck For</TableHead>
                      <TableHead className="h-9">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stuckItems.map((item) => (
                      <TableRow key={item.id} className="text-sm">
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.identifier}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs font-medium">{item.customer_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{item.customer_email || "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">{item.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium ${item.hours_stuck > 48 ? "text-red-400" : item.hours_stuck > 24 ? "text-orange-400" : "text-yellow-400"}`}>
                            {item.hours_stuck}h
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => navigate(item.type === "invoice" ? "/admin/payments-queue" : "/admin/fulfillment-queue")}
                          >
                            <ExternalLink className="h-3 w-3" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Recent Failures Drilldown */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("failures")}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <XCircle className="h-5 w-5 text-red-400" />
            Recent Failures (7d)
            {failedEvents.length > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 ml-2">
                {failedEvents.length}
              </Badge>
            )}
            {expandedSections.failures ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
          </CardTitle>
          <CardDescription>Failed events from system_event_log with error details</CardDescription>
        </CardHeader>
        {expandedSections.failures && (
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : failedEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-400/50" />
                <p className="text-sm">No failures in the last 7 days. System is running clean.</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="h-9 px-2">Time</TableHead>
                        <TableHead className="h-9 px-2">Event</TableHead>
                        <TableHead className="h-9 px-2">Entity</TableHead>
                        <TableHead className="h-9 px-2">Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedEvents.map((e) => (
                        <TableRow key={e.id} className="text-xs">
                          <TableCell className="px-2 py-1.5 whitespace-nowrap">
                            <div>
                              <p className="text-[11px]">{format(new Date(e.created_at), "MMM d HH:mm:ss")}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-1.5">
                            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">
                              {e.event_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-2 py-1.5">
                            <span className="text-muted-foreground">{e.entity_type}/</span>
                            <span className="font-mono text-[10px]">{e.entity_id.slice(0, 8)}…</span>
                          </TableCell>
                          <TableCell className="px-2 py-1.5 max-w-[300px]">
                            <span className="text-red-400 text-[10px]">{e.error_message || JSON.stringify(e.metadata).slice(0, 100)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default SystemHealth;
