import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Wifi, Mail, Truck, CreditCard, Server,
  CheckCircle2, AlertTriangle, Clock, Eye
} from "lucide-react";
import { format, subDays, formatDistanceToNow } from "date-fns";
import logo from "@/assets/reelflix-logo.png";

type ServiceName = "webhooks" | "payments" | "email" | "fulfillment" | "api";
type ServiceStatus = "operational" | "degraded" | "outage";

interface PublicService {
  id: ServiceName;
  label: string;
  icon: React.ElementType;
  status: ServiceStatus;
}

interface PublicIncident {
  id: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  updates: { message: string; status_change: string | null; created_at: string }[];
}

const STATUS_CONFIG = {
  operational: { label: "Operational", color: "text-green-400", dot: "bg-green-500" },
  degraded: { label: "Degraded Performance", color: "text-yellow-400", dot: "bg-yellow-500" },
  outage: { label: "Outage", color: "text-red-400", dot: "bg-red-500" },
};

const INCIDENT_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  investigating: { label: "Investigating", icon: Eye, color: "text-red-400" },
  identified: { label: "Identified", icon: AlertTriangle, color: "text-orange-400" },
  monitoring: { label: "Monitoring", icon: Clock, color: "text-yellow-400" },
  resolved: { label: "Resolved", icon: CheckCircle2, color: "text-green-400" },
};

const SERVICE_ICONS: Record<ServiceName, React.ElementType> = {
  webhooks: Wifi,
  payments: CreditCard,
  email: Mail,
  fulfillment: Truck,
  api: Server,
};

const PublicStatus = () => {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<PublicService[]>([]);
  const [incidents, setIncidents] = useState<PublicIncident[]>([]);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const d90 = subDays(now, 90).toISOString();

      // Load system events for service status calculation
      const { data: events } = await supabase
        .from("system_event_log")
        .select("event_type, status, created_at")
        .gte("created_at", h24)
        .limit(500);

      const allEvents = events || [];

      // Calculate service statuses
      const calcStatus = (filter: (e: any) => boolean): ServiceStatus => {
        const filtered = allEvents.filter(filter);
        const total = filtered.length;
        const fails = filtered.filter(e => e.status === "fail").length;
        const failRate = total > 0 ? (fails / total) * 100 : 0;
        return failRate > 20 ? "outage" : failRate > 5 ? "degraded" : "operational";
      };

      setServices([
        { id: "webhooks", label: "Webhook Processing", icon: Wifi, status: calcStatus(e => e.event_type.includes("webhook")) },
        { id: "payments", label: "Payment Processing", icon: CreditCard, status: calcStatus(e => e.event_type.includes("payment")) },
        { id: "email", label: "Email Delivery", icon: Mail, status: calcStatus(e => e.event_type.includes("email")) },
        { id: "fulfillment", label: "Fulfillment", icon: Truck, status: calcStatus(e => e.event_type.includes("fulfillment")) },
        { id: "api", label: "API Services", icon: Server, status: calcStatus(() => true) },
      ]);

      // Load public incidents with public updates (90 days)
      const { data: incidentData } = await supabase
        .from("incidents")
        .select("id, title, severity, status, created_at, resolved_at")
        .gte("created_at", d90)
        .order("created_at", { ascending: false });

      const incidentIds = (incidentData || []).map(i => i.id);
      let updatesMap: Record<string, any[]> = {};

      if (incidentIds.length > 0) {
        const { data: updates } = await supabase
          .from("incident_updates")
          .select("incident_id, message, status_change, created_at")
          .in("incident_id", incidentIds)
          .eq("is_public", true)
          .order("created_at", { ascending: false });

        (updates || []).forEach(u => {
          if (!updatesMap[u.incident_id]) updatesMap[u.incident_id] = [];
          updatesMap[u.incident_id].push(u);
        });
      }

      setIncidents(
        (incidentData || []).map(i => ({
          ...i,
          updates: updatesMap[i.id] || [],
        }))
      );
    } catch (err) {
      console.error("Error loading public status:", err);
    } finally {
      setLoading(false);
    }
  };

  const overallStatus = services.some(s => s.status === "outage")
    ? "outage"
    : services.some(s => s.status === "degraded")
    ? "degraded"
    : "operational";

  const activeIncidents = incidents.filter(i => i.status !== "resolved");
  const pastIncidents = incidents.filter(i => i.status === "resolved");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <img src={logo} alt="ReelFlix" className="h-10 mx-auto" />
          <h1 className="text-2xl font-bold">System Status</h1>
        </div>

        {/* Overall Banner */}
        <Card className={`border ${
          overallStatus === "outage" ? "border-red-500/30 bg-red-500/5"
            : overallStatus === "degraded" ? "border-yellow-500/30 bg-yellow-500/5"
            : "border-green-500/30 bg-green-500/5"
        }`}>
          <CardContent className="py-5 flex items-center justify-center gap-3">
            <div className={`h-3 w-3 rounded-full ${STATUS_CONFIG[overallStatus].dot} ${overallStatus !== "operational" ? "animate-pulse" : ""}`} />
            <span className={`text-lg font-semibold ${STATUS_CONFIG[overallStatus].color}`}>
              {overallStatus === "operational" ? "All Systems Operational"
                : overallStatus === "degraded" ? "Partial System Degradation"
                : "Service Disruption"}
            </span>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {services.map(service => {
              const config = STATUS_CONFIG[service.status];
              const Icon = service.icon;
              return (
                <div key={service.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-sm">{service.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${config.dot}`} />
                    <span className={`text-sm ${config.color}`}>{config.label}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Active Incidents */}
        {activeIncidents.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Active Incidents</h2>
            {activeIncidents.map(incident => {
              const statusCfg = INCIDENT_STATUS_CONFIG[incident.status] || INCIDENT_STATUS_CONFIG.investigating;
              const StatusIcon = statusCfg.icon;
              return (
                <Card key={incident.id} className="border-yellow-500/20">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{incident.title}</h3>
                      <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusCfg.label}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Started {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </span>
                    {incident.updates.length > 0 && (
                      <div className="border-l-2 border-border pl-4 space-y-2 mt-2">
                        {incident.updates.slice(0, 5).map((u, idx) => (
                          <div key={idx} className="text-sm">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(u.created_at), "MMM d, HH:mm")}
                            </span>
                            {u.status_change && (
                              <Badge variant="outline" className="text-[10px] ml-2">→ {u.status_change}</Badge>
                            )}
                            <p className="text-muted-foreground">{u.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Past Incidents (90 days) */}
        {pastIncidents.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Past Incidents (90 days)</h2>
            {pastIncidents.slice(0, 20).map(incident => (
              <Card key={incident.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-sm">{incident.title}</h3>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(incident.created_at), "MMM d, yyyy")}
                        {incident.resolved_at && ` — Resolved ${format(new Date(incident.resolved_at), "MMM d, HH:mm")}`}
                      </span>
                    </div>
                    <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Resolved
                    </Badge>
                  </div>
                  {incident.updates.length > 0 && (
                    <div className="border-l-2 border-border pl-4 mt-3 space-y-2">
                      {incident.updates.slice(0, 3).map((u, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground">
                          <span>{format(new Date(u.created_at), "HH:mm")}: </span>
                          {u.message}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Last updated {format(new Date(), "MMM d, yyyy HH:mm")} • Powered by ReelFlix
        </p>
      </div>
    </div>
  );
};

export default PublicStatus;
