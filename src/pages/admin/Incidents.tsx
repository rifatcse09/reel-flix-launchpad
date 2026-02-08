import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, AlertTriangle, Clock, Eye, CheckCircle2,
  Shield, ChevronDown, ChevronRight, Link2, MessageSquare, User
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { IncidentTimeline } from "@/components/admin/IncidentTimeline";
import { LinkEventsDialog } from "@/components/admin/LinkEventsDialog";

type Severity = "low" | "medium" | "high" | "critical";
type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  owner_id: string | null;
  created_by: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; icon: React.ElementType }> = {
  critical: { label: "Critical", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
  high: { label: "High", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle },
  medium: { label: "Medium", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Shield },
  low: { label: "Low", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Shield },
};

const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string; icon: React.ElementType }> = {
  investigating: { label: "Investigating", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: Eye },
  identified: { label: "Identified", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle },
  monitoring: { label: "Monitoring", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  resolved: { label: "Resolved", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
};

const Incidents = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSeverity, setNewSeverity] = useState<Severity>("medium");
  const [creating, setCreating] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/dashboard/profile");
  }, [isAdmin, adminLoading, navigate]);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterStatus === "active") {
        query = query.in("status", ["investigating", "identified", "monitoring"]);
      } else if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      if (filterSeverity !== "all") {
        query = query.eq("severity", filterSeverity);
      }

      const { data, error } = await query;
      if (error) throw error;
      setIncidents((data || []) as Incident[]);

      // Load profiles for created_by/owner
      const userIds = new Set<string>();
      (data || []).forEach(i => {
        userIds.add(i.created_by);
        if (i.owner_id) userIds.add(i.owner_id);
        if (i.resolved_by) userIds.add(i.resolved_by);
      });

      if (userIds.size > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", Array.from(userIds));
        const map: Record<string, string> = {};
        (profs || []).forEach(p => {
          map[p.id] = p.full_name || p.email || p.id.slice(0, 8);
        });
        setProfiles(map);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load incidents.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSeverity, toast]);

  useEffect(() => {
    if (isAdmin) loadIncidents();
  }, [isAdmin, loadIncidents]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("incidents").insert({
        title: newTitle.trim(),
        description: newDesc.trim(),
        severity: newSeverity,
        created_by: user.id,
        owner_id: user.id,
      });
      if (error) throw error;

      toast({ title: "Incident Created", description: `"${newTitle}" has been logged.` });
      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewSeverity("medium");
      loadIncidents();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (incident: Incident, newStatus: IncidentStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: any = { status: newStatus };
      if (newStatus === "resolved") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user.id;
      }

      const { error } = await supabase.from("incidents").update(updates).eq("id", incident.id);
      if (error) throw error;

      // Add timeline update
      await supabase.from("incident_updates").insert({
        incident_id: incident.id,
        message: `Status changed from ${incident.status} to ${newStatus}`,
        status_change: newStatus,
        created_by: user.id,
        is_public: true,
      });

      toast({ title: "Updated", description: `Incident status → ${newStatus}` });
      loadIncidents();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const activeCount = incidents.filter(i => i.status !== "resolved").length;
  const criticalCount = incidents.filter(i => i.severity === "critical" && i.status !== "resolved").length;

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
            <AlertTriangle className="h-8 w-8 text-primary" />
            Incident Management
          </h1>
          <p className="text-muted-foreground">
            {activeCount} active incident{activeCount !== 1 ? "s" : ""}
            {criticalCount > 0 && <span className="text-red-400 ml-2">• {criticalCount} critical</span>}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Incident</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Incident</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Brief incident title" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What happened?" rows={3} />
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={newSeverity} onValueChange={v => setNewSeverity(v as Severity)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={creating || !newTitle.trim()} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Incident
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="identified">Identified</SelectItem>
            <SelectItem value="monitoring">Monitoring</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Incidents List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : incidents.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No incidents found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {incidents.map(incident => {
            const sevConfig = SEVERITY_CONFIG[incident.severity];
            const statusConfig = STATUS_CONFIG[incident.status];
            const isExpanded = expandedId === incident.id;
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={incident.id} className={`transition-all ${incident.severity === "critical" && incident.status !== "resolved" ? "border-red-500/40" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button onClick={() => setExpandedId(isExpanded ? null : incident.id)} className="mt-1">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{incident.title}</h3>
                          <Badge className={`text-[10px] ${sevConfig.color}`}>{sevConfig.label}</Badge>
                          <Badge className={`text-[10px] ${statusConfig.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />{statusConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>Created {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</span>
                          {incident.owner_id && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {profiles[incident.owner_id] || "Unknown"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {incident.status !== "resolved" && (
                        <Select value={incident.status} onValueChange={v => handleStatusChange(incident, v as IncidentStatus)}>
                          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="investigating">Investigating</SelectItem>
                            <SelectItem value="identified">Identified</SelectItem>
                            <SelectItem value="monitoring">Monitoring</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-4 pl-7">
                      {incident.description && (
                        <p className="text-sm text-muted-foreground">{incident.description}</p>
                      )}
                      <div className="flex gap-2">
                        <LinkEventsDialog incidentId={incident.id} onLinked={loadIncidents} />
                      </div>
                      <IncidentTimeline incidentId={incident.id} profiles={profiles} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Incidents;
