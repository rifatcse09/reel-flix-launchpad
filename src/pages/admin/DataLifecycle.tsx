import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useStaffActivityLog } from "@/hooks/useStaffActivityLog";
import { Database, Trash2, Shield, Clock, Edit, Plus, History } from "lucide-react";
import { format } from "date-fns";

interface RetentionPolicy {
  id: string;
  entity_type: string;
  retention_days: number;
  description: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface LifecycleEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  performed_by: string;
  details: Record<string, unknown>;
  created_at: string;
}

const EVENT_TYPE_BADGES: Record<string, string> = {
  retention_set: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  deletion_marked: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  deletion_completed: "bg-red-500/20 text-red-400 border-red-500/30",
  anonymization: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const EVENT_LABELS: Record<string, string> = {
  retention_set: "Retention Policy Set",
  deletion_marked: "Data Marked for Deletion",
  deletion_completed: "Data Deleted",
  anonymization: "Data Anonymized",
};

export default function DataLifecycle() {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<RetentionPolicy | null>(null);
  const [policyForm, setPolicyForm] = useState({ entity_type: "", retention_days: "365", description: "" });
  const [eventForm, setEventForm] = useState({ event_type: "deletion_marked", entity_type: "", entity_id: "", notes: "" });
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { role } = usePermissions();
  const { logActivity } = useStaffActivityLog();
  const isSuperAdmin = role === "super_admin" || role === "admin";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [policiesRes, eventsRes] = await Promise.all([
      supabase.from("retention_policies").select("*").order("entity_type"),
      supabase.from("data_lifecycle_events").select("*").order("created_at", { ascending: false }).limit(100),
    ]);

    if (policiesRes.data) setPolicies(policiesRes.data as RetentionPolicy[]);
    if (eventsRes.data) {
      setEvents(eventsRes.data as LifecycleEvent[]);
      const userIds = [...new Set(eventsRes.data.map(e => e.performed_by))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase.from("profiles").select("id, email").in("id", userIds);
        if (profileData) {
          const map: Record<string, string> = {};
          profileData.forEach(p => { map[p.id] = p.email || p.id.slice(0, 8); });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  const handleSavePolicy = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (selectedPolicy) {
      const { error } = await supabase
        .from("retention_policies")
        .update({
          retention_days: parseInt(policyForm.retention_days),
          description: policyForm.description || null,
          updated_by: user.id,
        })
        .eq("id", selectedPolicy.id);

      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

      // Log the event
      await supabase.from("data_lifecycle_events").insert({
        event_type: "retention_set",
        entity_type: selectedPolicy.entity_type,
        performed_by: user.id,
        details: { old_days: selectedPolicy.retention_days, new_days: parseInt(policyForm.retention_days) },
      });

      await logActivity({
        actionType: "change",
        entityType: "retention_policy",
        entityId: selectedPolicy.id,
        description: `Updated retention for ${selectedPolicy.entity_type}: ${selectedPolicy.retention_days}d → ${policyForm.retention_days}d`,
      });

      toast({ title: "Retention policy updated" });
    } else {
      const { error } = await supabase.from("retention_policies").insert({
        entity_type: policyForm.entity_type,
        retention_days: parseInt(policyForm.retention_days),
        description: policyForm.description || null,
        created_by: user.id,
      });

      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

      await supabase.from("data_lifecycle_events").insert({
        event_type: "retention_set",
        entity_type: policyForm.entity_type,
        performed_by: user.id,
        details: { retention_days: parseInt(policyForm.retention_days) },
      });

      await logActivity({
        actionType: "change",
        entityType: "retention_policy",
        description: `Created retention policy for ${policyForm.entity_type}: ${policyForm.retention_days}d`,
      });

      toast({ title: "Retention policy created" });
    }

    setPolicyDialogOpen(false);
    setSelectedPolicy(null);
    loadData();
  };

  const handleLogEvent = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("data_lifecycle_events").insert({
      event_type: eventForm.event_type,
      entity_type: eventForm.entity_type,
      entity_id: eventForm.entity_id || null,
      performed_by: user.id,
      details: { notes: eventForm.notes },
    });

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    await logActivity({
      actionType: "change",
      entityType: "data_lifecycle",
      description: `${EVENT_LABELS[eventForm.event_type] || eventForm.event_type}: ${eventForm.entity_type}${eventForm.entity_id ? ` (${eventForm.entity_id})` : ""}`,
    });

    toast({ title: "Event logged" });
    setEventDialogOpen(false);
    setEventForm({ event_type: "deletion_marked", entity_type: "", entity_id: "", notes: "" });
    loadData();
  };

  const handleEditPolicy = (p: RetentionPolicy) => {
    setSelectedPolicy(p);
    setPolicyForm({
      entity_type: p.entity_type,
      retention_days: String(p.retention_days),
      description: p.description || "",
    });
    setPolicyDialogOpen(true);
  };

  const handleNewPolicy = () => {
    setSelectedPolicy(null);
    setPolicyForm({ entity_type: "", retention_days: "365", description: "" });
    setPolicyDialogOpen(true);
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Shield className="h-8 w-8 mr-3" />
        Data lifecycle controls are restricted to super admins.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Lifecycle Controls</h1>
          <p className="text-muted-foreground">Manage data retention, deletion, and anonymization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEventDialogOpen(true)} className="gap-2">
            <History className="h-4 w-4" /> Log Event
          </Button>
          <Button onClick={handleNewPolicy} className="gap-2">
            <Plus className="h-4 w-4" /> Add Policy
          </Button>
        </div>
      </div>

      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">Retention Policies</TabsTrigger>
          <TabsTrigger value="history">Event History</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : policies.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Database className="mx-auto h-8 w-8 mb-2 opacity-50" />
                No retention policies configured yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {policies.map(p => (
                <Card key={p.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Database className="h-4 w-4 text-primary" />
                        {p.entity_type}
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => handleEditPolicy(p)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Retention</span>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {p.retention_days} days
                      </Badge>
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Updated {format(new Date(p.updated_at), "MMM d, yyyy")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              {events.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No lifecycle events recorded.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(e.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge className={EVENT_TYPE_BADGES[e.event_type] || "bg-muted text-muted-foreground"}>
                            {EVENT_LABELS[e.event_type] || e.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{e.entity_type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono text-xs">
                          {e.entity_id || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {profiles[e.performed_by] || e.performed_by.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {e.details && typeof e.details === "object" && "notes" in e.details
                            ? String(e.details.notes)
                            : JSON.stringify(e.details)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Policy Dialog */}
      <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPolicy ? "Edit Retention Policy" : "New Retention Policy"}</DialogTitle>
            <DialogDescription>
              Define how long data should be retained before being eligible for cleanup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedPolicy && (
              <Input
                placeholder="Entity type (e.g., user_sessions)"
                value={policyForm.entity_type}
                onChange={(e) => setPolicyForm(p => ({ ...p, entity_type: e.target.value }))}
              />
            )}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Retention Period (days)</label>
              <Input
                type="number"
                min="1"
                value={policyForm.retention_days}
                onChange={(e) => setPolicyForm(p => ({ ...p, retention_days: e.target.value }))}
              />
            </div>
            <Textarea
              placeholder="Description"
              value={policyForm.description}
              onChange={(e) => setPolicyForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPolicyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePolicy} disabled={!selectedPolicy && !policyForm.entity_type}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Lifecycle Event</DialogTitle>
            <DialogDescription>Record a data lifecycle action (deletion, anonymization, etc.)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={eventForm.event_type} onValueChange={(v) => setEventForm(p => ({ ...p, event_type: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deletion_marked">Mark for Deletion</SelectItem>
                <SelectItem value="deletion_completed">Deletion Completed</SelectItem>
                <SelectItem value="anonymization">Anonymization</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Entity type (e.g., profiles, user_sessions)"
              value={eventForm.entity_type}
              onChange={(e) => setEventForm(p => ({ ...p, entity_type: e.target.value }))}
            />
            <Input
              placeholder="Entity ID (optional)"
              value={eventForm.entity_id}
              onChange={(e) => setEventForm(p => ({ ...p, entity_id: e.target.value }))}
            />
            <Textarea
              placeholder="Notes"
              value={eventForm.notes}
              onChange={(e) => setEventForm(p => ({ ...p, notes: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLogEvent} disabled={!eventForm.entity_type}>Log Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
