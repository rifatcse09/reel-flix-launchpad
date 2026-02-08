import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, FileText, Shield, CheckCircle2, Rocket,
  RotateCcw, AlertTriangle, Link2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type RiskLevel = "low" | "medium" | "high" | "critical";
type ChangeStatus = "draft" | "approved" | "deployed" | "rolled_back" | "completed";

interface ChangeRecord {
  id: string;
  title: string;
  description: string;
  risk_level: RiskLevel;
  expected_impact: string;
  rollback_plan: string;
  status: ChangeStatus;
  approved_by: string | null;
  approved_at: string | null;
  deployed_at: string | null;
  deployed_by: string | null;
  incident_id: string | null;
  created_by: string;
  created_at: string;
}

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  critical: { label: "Critical", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  high: { label: "High", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  medium: { label: "Medium", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  low: { label: "Low", color: "bg-green-500/20 text-green-400 border-green-500/30" },
};

const STATUS_CONFIG: Record<ChangeStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: FileText },
  approved: { label: "Approved", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: CheckCircle2 },
  deployed: { label: "Deployed", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: Rocket },
  rolled_back: { label: "Rolled Back", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: RotateCcw },
  completed: { label: "Completed", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
};

const ChangeManagement = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ChangeRecord[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [incidents, setIncidents] = useState<{ id: string; title: string }[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  // Form state
  const [form, setForm] = useState({
    title: "", description: "", risk_level: "medium" as RiskLevel,
    expected_impact: "", rollback_plan: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/dashboard/profile");
  }, [isAdmin, adminLoading, navigate]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsRes, incidentsRes] = await Promise.all([
        supabase.from("change_records").select("*").order("created_at", { ascending: false }),
        supabase.from("incidents").select("id, title").in("status", ["investigating", "identified", "monitoring", "resolved"]).order("created_at", { ascending: false }).limit(50),
      ]);

      setRecords((recordsRes.data || []) as ChangeRecord[]);
      setIncidents(incidentsRes.data || []);

      const userIds = new Set<string>();
      (recordsRes.data || []).forEach(r => {
        userIds.add(r.created_by);
        if (r.approved_by) userIds.add(r.approved_by);
        if (r.deployed_by) userIds.add(r.deployed_by);
      });
      if (userIds.size > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", Array.from(userIds));
        const map: Record<string, string> = {};
        (profs || []).forEach(p => { map[p.id] = p.full_name || p.email || p.id.slice(0, 8); });
        setProfiles(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadRecords();
  }, [isAdmin, loadRecords]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("change_records").insert({
        ...form,
        created_by: user.id,
      });
      if (error) throw error;

      toast({ title: "Change Record Created" });
      setCreateOpen(false);
      setForm({ title: "", description: "", risk_level: "medium", expected_impact: "", rollback_plan: "" });
      loadRecords();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (record: ChangeRecord, action: "approve" | "deploy" | "rollback" | "complete" | "link_incident", incidentId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: any = {};
      if (action === "approve") {
        updates.status = "approved";
        updates.approved_by = user.id;
        updates.approved_at = new Date().toISOString();
      } else if (action === "deploy") {
        updates.status = "deployed";
        updates.deployed_by = user.id;
        updates.deployed_at = new Date().toISOString();
      } else if (action === "rollback") {
        updates.status = "rolled_back";
      } else if (action === "complete") {
        updates.status = "completed";
      } else if (action === "link_incident" && incidentId) {
        updates.incident_id = incidentId;
      }

      const { error } = await supabase.from("change_records").update(updates).eq("id", record.id);
      if (error) throw error;
      toast({ title: "Updated" });
      loadRecords();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (adminLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" /> Change Management
          </h1>
          <p className="text-muted-foreground">Track system changes with risk assessment and approvals</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Change</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Change Record</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Change title" />
              </div>
              <div>
                <Label>Description *</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is being changed?" rows={3} />
              </div>
              <div>
                <Label>Risk Level</Label>
                <Select value={form.risk_level} onValueChange={v => setForm(f => ({ ...f, risk_level: v as RiskLevel }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expected Impact *</Label>
                <Textarea value={form.expected_impact} onChange={e => setForm(f => ({ ...f, expected_impact: e.target.value }))} placeholder="What will be affected?" rows={2} />
              </div>
              <div>
                <Label>Rollback Plan *</Label>
                <Textarea value={form.rollback_plan} onChange={e => setForm(f => ({ ...f, rollback_plan: e.target.value }))} placeholder="How to revert if things go wrong?" rows={2} />
              </div>
              <Button onClick={handleCreate} disabled={creating || !form.title.trim() || !form.description.trim()} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Change Record
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : records.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No change records yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {records.map(record => {
            const riskConfig = RISK_CONFIG[record.risk_level];
            const statusConfig = STATUS_CONFIG[record.status];
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{record.title}</h3>
                        <Badge className={`text-[10px] ${riskConfig.color}`}>Risk: {riskConfig.label}</Badge>
                        <Badge className={`text-[10px] ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />{statusConfig.label}
                        </Badge>
                        {record.incident_id && (
                          <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Linked Incident
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{record.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span>By {profiles[record.created_by] || "Admin"}</span>
                        <span>{formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}</span>
                        {record.approved_by && <span>Approved by {profiles[record.approved_by] || "Admin"}</span>}
                        {record.deployed_at && <span>Deployed {format(new Date(record.deployed_at), "MMM d, HH:mm")}</span>}
                      </div>
                      {record.expected_impact && (
                        <div className="mt-2 text-xs"><span className="font-medium">Impact:</span> {record.expected_impact}</div>
                      )}
                      {record.rollback_plan && (
                        <div className="mt-1 text-xs"><span className="font-medium">Rollback:</span> {record.rollback_plan}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {record.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => handleAction(record, "approve")} className="gap-1 text-xs">
                          <CheckCircle2 className="h-3 w-3" /> Approve
                        </Button>
                      )}
                      {record.status === "approved" && (
                        <Button size="sm" onClick={() => handleAction(record, "deploy")} className="gap-1 text-xs">
                          <Rocket className="h-3 w-3" /> Deploy
                        </Button>
                      )}
                      {record.status === "deployed" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleAction(record, "complete")} className="gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> Complete
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleAction(record, "rollback")} className="gap-1 text-xs">
                            <RotateCcw className="h-3 w-3" /> Rollback
                          </Button>
                        </>
                      )}
                      {!record.incident_id && incidents.length > 0 && (record.status === "deployed" || record.status === "rolled_back") && (
                        <Select onValueChange={v => handleAction(record, "link_incident", v)}>
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <Link2 className="h-3 w-3 mr-1" />
                            <SelectValue placeholder="Link Incident" />
                          </SelectTrigger>
                          <SelectContent>
                            {incidents.map(i => (
                              <SelectItem key={i.id} value={i.id} className="text-xs">{i.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
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

export default ChangeManagement;
