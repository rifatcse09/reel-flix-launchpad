import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCircle2, AlertTriangle, XCircle, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export function OperationalAlertsWidget() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("operational_alerts")
        .select("*")
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setAlerts((data as Alert[]) || []);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    // Poll every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  const acknowledgeAlert = async (alertId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("operational_alerts")
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user?.id,
      })
      .eq("id", alertId);
    loadAlerts();
    toast({ title: "Alert Acknowledged" });
  };

  const resolveAlert = async (alertId: string) => {
    await supabase
      .from("operational_alerts")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", alertId);
    loadAlerts();
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "critical": return "border-l-red-500 bg-red-500/5";
      case "warning": return "border-l-amber-500 bg-amber-500/5";
      default: return "border-l-blue-500 bg-blue-500/5";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="h-4 w-4 text-red-400" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      default: return <Clock className="h-4 w-4 text-blue-400" />;
    }
  };

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged_at).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-primary" />
          Operational Alerts
          {unacknowledgedCount > 0 && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 ml-2">
              {unacknowledgedCount} new
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Real-time alerts for webhooks, payments, and fulfillment issues</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400/50" />
            <p className="text-sm">No active alerts</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`border-l-4 rounded-r-lg p-3 ${getSeverityStyle(alert.severity)} ${
                  alert.acknowledged_at ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        {alert.entity_type && ` · ${alert.entity_type}/${alert.entity_id?.slice(0, 8)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!alert.acknowledged_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px]"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px]"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
