import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, RefreshCw, Target, CheckCircle2,
  AlertTriangle, XCircle, TrendingUp, Clock
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, differenceInMinutes, differenceInHours } from "date-fns";

interface SLATarget {
  id: string;
  metric_name: string;
  display_name: string;
  target_value: number;
  target_unit: string;
  warning_threshold: number;
  critical_threshold: number;
  description: string | null;
}

interface CalculatedSLA {
  target: SLATarget;
  actual: number;
  status: "met" | "at_risk" | "breached";
  compliance: number;
}

const STATUS_CONFIG = {
  met: { label: "Met", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2, dotColor: "bg-green-500" },
  at_risk: { label: "At Risk", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: AlertTriangle, dotColor: "bg-yellow-500" },
  breached: { label: "Breached", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle, dotColor: "bg-red-500" },
};

const SLAMonitoring = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<SLATarget[]>([]);
  const [calculated, setCalculated] = useState<CalculatedSLA[]>([]);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/dashboard/profile");
  }, [isAdmin, adminLoading, navigate]);

  const loadTargets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sla_targets")
        .select("*")
        .order("metric_name");
      if (error) throw error;
      setTargets(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadTargets();
  }, [isAdmin, loadTargets]);

  const calculateCompliance = useCallback(async () => {
    if (targets.length === 0) return;
    setCalculating(true);

    try {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = now.toISOString();

      // Fetch events for the current month
      const [eventsRes, paymentsRes, fulfillmentRes] = await Promise.all([
        supabase
          .from("system_event_log")
          .select("event_type, status, created_at")
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd)
          .limit(1000),
        supabase
          .from("payments")
          .select("status, created_at, received_at")
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd),
        supabase
          .from("fulfillment")
          .select("status, created_at, sent_at")
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd),
      ]);

      const events = eventsRes.data || [];
      const payments = paymentsRes.data || [];
      const fulfillments = fulfillmentRes.data || [];

      const results: CalculatedSLA[] = targets.map(target => {
        let actual = 0;

        switch (target.metric_name) {
          case "webhook_success": {
            const webhookEvents = events.filter(e => e.event_type.includes("webhook"));
            const total = webhookEvents.length;
            const successes = webhookEvents.filter(e => e.status !== "fail").length;
            actual = total > 0 ? (successes / total) * 100 : 100;
            break;
          }
          case "payment_processing": {
            const confirmedPayments = payments.filter(p => p.status === "confirmed" && p.received_at);
            if (confirmedPayments.length > 0) {
              const avgMinutes = confirmedPayments.reduce((sum, p) => {
                return sum + differenceInMinutes(new Date(p.received_at!), new Date(p.created_at));
              }, 0) / confirmedPayments.length;
              actual = avgMinutes;
            } else {
              actual = 0; // No data = assume met
            }
            break;
          }
          case "fulfillment_time": {
            const completedFulfillments = fulfillments.filter(f => f.status === "sent" && f.sent_at);
            if (completedFulfillments.length > 0) {
              const avgHours = completedFulfillments.reduce((sum, f) => {
                return sum + differenceInHours(new Date(f.sent_at!), new Date(f.created_at));
              }, 0) / completedFulfillments.length;
              actual = avgHours;
            } else {
              actual = 0;
            }
            break;
          }
          case "email_delivery": {
            const emailEvents = events.filter(e => e.event_type.includes("email"));
            const total = emailEvents.length;
            const successes = emailEvents.filter(e => e.status !== "fail").length;
            actual = total > 0 ? (successes / total) * 100 : 100;
            break;
          }
          case "system_uptime": {
            const total = events.length;
            const successes = events.filter(e => e.status !== "fail").length;
            actual = total > 0 ? (successes / total) * 100 : 100;
            break;
          }
          default:
            actual = 100;
        }

        // Determine status based on unit
        let status: "met" | "at_risk" | "breached";
        if (target.target_unit === "percent") {
          // Higher is better
          status = actual >= target.target_value ? "met"
            : actual >= target.critical_threshold ? "at_risk"
            : "breached";
        } else {
          // Lower is better (minutes, hours)
          status = actual <= target.target_value ? "met"
            : actual <= target.critical_threshold ? "at_risk"
            : "breached";
        }

        // Calculate compliance percentage
        let compliance: number;
        if (target.target_unit === "percent") {
          compliance = Math.min(100, (actual / target.target_value) * 100);
        } else {
          compliance = actual <= 0 ? 100 : Math.min(100, (target.target_value / actual) * 100);
        }

        return { target, actual, status, compliance };
      });

      setCalculated(results);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to calculate SLA compliance.", variant: "destructive" });
    } finally {
      setCalculating(false);
    }
  }, [targets, toast]);

  useEffect(() => {
    if (targets.length > 0) calculateCompliance();
  }, [targets, calculateCompliance]);

  const overallStatus = calculated.some(c => c.status === "breached")
    ? "breached"
    : calculated.some(c => c.status === "at_risk")
    ? "at_risk"
    : "met";

  const metCount = calculated.filter(c => c.status === "met").length;

  if (adminLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            SLA Monitoring
          </h1>
          <p className="text-muted-foreground">
            Monthly compliance tracking — {format(new Date(), "MMMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <OverallBadge status={overallStatus} metCount={metCount} total={calculated.length} />
          <Button variant="outline" onClick={calculateCompliance} disabled={calculating} className="gap-2">
            {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Recalculate
          </Button>
        </div>
      </div>

      {/* Overall Banner */}
      <Card className={`border ${
        overallStatus === "breached" ? "border-red-500/30 bg-red-500/5"
          : overallStatus === "at_risk" ? "border-yellow-500/30 bg-yellow-500/5"
          : "border-green-500/30 bg-green-500/5"
      }`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${STATUS_CONFIG[overallStatus].dotColor} ${overallStatus !== "met" ? "animate-pulse" : ""}`} />
              <span className={`text-lg font-semibold`}>
                {overallStatus === "met" ? "All SLAs Met"
                  : overallStatus === "at_risk" ? "Some SLAs At Risk"
                  : "SLA Breach Detected"}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {metCount}/{calculated.length} targets met
            </span>
          </div>
        </CardContent>
      </Card>

      {/* SLA Cards */}
      {loading || calculating ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {calculated.map(sla => {
            const config = STATUS_CONFIG[sla.status];
            const StatusIcon = config.icon;

            return (
              <Card key={sla.target.id} className={`border ${
                sla.status === "breached" ? "border-red-500/20"
                  : sla.status === "at_risk" ? "border-yellow-500/20"
                  : "border-green-500/20"
              }`}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{sla.target.display_name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sla.target.description}
                      </p>
                    </div>
                    <Badge className={`text-[10px] ${config.color}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>

                  {/* Metric display */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold tracking-tight">
                        {sla.target.target_unit === "percent"
                          ? `${sla.actual.toFixed(1)}%`
                          : sla.target.target_unit === "minutes"
                          ? `${sla.actual.toFixed(0)}m`
                          : `${sla.actual.toFixed(1)}h`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Target: {sla.target.target_unit === "percent"
                          ? `${sla.target.target_value}%`
                          : sla.target.target_unit === "minutes"
                          ? `≤${sla.target.target_value}m`
                          : `≤${sla.target.target_value}h`}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, sla.compliance)}
                      className="h-2"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Compliance: {sla.compliance.toFixed(1)}%</span>
                      <span>
                        Warning: {sla.target.target_unit === "percent"
                          ? `<${sla.target.warning_threshold}%`
                          : `>${sla.target.warning_threshold}${sla.target.target_unit === "minutes" ? "m" : "h"}`}
                      </span>
                    </div>
                  </div>

                  {/* Thresholds */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] border-t border-border pt-2">
                    <div>
                      <div className="text-green-400 font-medium">Target</div>
                      <div>{sla.target.target_value}{sla.target.target_unit === "percent" ? "%" : sla.target.target_unit === "minutes" ? "m" : "h"}</div>
                    </div>
                    <div>
                      <div className="text-yellow-400 font-medium">Warning</div>
                      <div>{sla.target.warning_threshold}{sla.target.target_unit === "percent" ? "%" : sla.target.target_unit === "minutes" ? "m" : "h"}</div>
                    </div>
                    <div>
                      <div className="text-red-400 font-medium">Critical</div>
                      <div>{sla.target.critical_threshold}{sla.target.target_unit === "percent" ? "%" : sla.target.target_unit === "minutes" ? "m" : "h"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

function OverallBadge({ status, metCount, total }: { status: string; metCount: number; total: number }) {
  return (
    <Badge className={`px-3 py-1 text-sm ${
      status === "met" ? "bg-green-500/20 text-green-400 border-green-500/30"
        : status === "at_risk" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        : "bg-red-500/20 text-red-400 border-red-500/30"
    }`}>
      {status === "met" ? `✓ ${metCount}/${total} MET` : status === "at_risk" ? `⚡ AT RISK` : `⚠️ BREACHED`}
    </Badge>
  );
}

export default SLAMonitoring;
