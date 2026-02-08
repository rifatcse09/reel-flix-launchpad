import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Search, Plus, BookOpen, Tag, Link2, Clock, Edit, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Runbook {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface RunbookIncidentLink {
  id: string;
  runbook_id: string;
  incident_id: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "payments", label: "Payments" },
  { value: "webhooks", label: "Webhooks" },
  { value: "billing", label: "Billing" },
  { value: "security", label: "Security" },
  { value: "fulfillment", label: "Fulfillment" },
  { value: "general", label: "General" },
];

const CATEGORY_COLORS: Record<string, string> = {
  payments: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  webhooks: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  billing: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  security: "bg-red-500/20 text-red-400 border-red-500/30",
  fulfillment: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  general: "bg-muted text-muted-foreground border-border",
};

export default function Runbooks() {
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedRunbook, setSelectedRunbook] = useState<Runbook | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [incidents, setIncidents] = useState<{ id: string; title: string; status: string }[]>([]);
  const [linkedIncidents, setLinkedIncidents] = useState<RunbookIncidentLink[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [editForm, setEditForm] = useState({ title: "", category: "general", content: "", tags: "" });
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("manage_settings");

  useEffect(() => {
    loadRunbooks();
  }, []);

  const loadRunbooks = async () => {
    const { data, error } = await supabase
      .from("runbooks")
      .select("*")
      .order("category")
      .order("title");
    if (!error && data) setRunbooks(data as Runbook[]);
    setLoading(false);
  };

  const loadLinkedIncidents = async (runbookId: string) => {
    const { data } = await supabase
      .from("runbook_incident_links")
      .select("*")
      .eq("runbook_id", runbookId);
    if (data) setLinkedIncidents(data);
  };

  const loadIncidents = async () => {
    const { data } = await supabase
      .from("incidents")
      .select("id, title, status")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setIncidents(data);
  };

  const handleCreate = () => {
    setEditForm({ title: "", category: "general", content: "", tags: "" });
    setSelectedRunbook(null);
    setEditDialogOpen(true);
  };

  const handleEdit = (rb: Runbook) => {
    setEditForm({
      title: rb.title,
      category: rb.category,
      content: rb.content,
      tags: rb.tags.join(", "),
    });
    setSelectedRunbook(rb);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const tags = editForm.tags.split(",").map(t => t.trim()).filter(Boolean);

    if (selectedRunbook) {
      const { error } = await supabase
        .from("runbooks")
        .update({
          title: editForm.title,
          category: editForm.category,
          content: editForm.content,
          tags,
          updated_by: user.id,
        })
        .eq("id", selectedRunbook.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Runbook updated" });
    } else {
      const { error } = await supabase.from("runbooks").insert({
        title: editForm.title,
        category: editForm.category,
        content: editForm.content,
        tags,
        created_by: user.id,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Runbook created" });
    }

    setEditDialogOpen(false);
    loadRunbooks();
  };

  const handleOpenLink = (rb: Runbook) => {
    setSelectedRunbook(rb);
    loadLinkedIncidents(rb.id);
    loadIncidents();
    setLinkDialogOpen(true);
  };

  const handleLinkIncident = async () => {
    if (!selectedRunbook || !selectedIncidentId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("runbook_incident_links").insert({
      runbook_id: selectedRunbook.id,
      incident_id: selectedIncidentId,
      linked_by: user.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Incident linked" });
    setSelectedIncidentId("");
    loadLinkedIncidents(selectedRunbook.id);
  };

  const filtered = runbooks.filter((rb) => {
    const matchesSearch =
      !search ||
      rb.title.toLowerCase().includes(search.toLowerCase()) ||
      rb.content.toLowerCase().includes(search.toLowerCase()) ||
      rb.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || rb.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operational Runbooks</h1>
          <p className="text-muted-foreground">Knowledge base for common operational procedures</p>
        </div>
        {canEdit && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Runbook
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search runbooks by title, content, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading runbooks...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No runbooks found. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((rb) => (
            <Card
              key={rb.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedRunbook(selectedRunbook?.id === rb.id ? null : rb)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      {rb.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={CATEGORY_COLORS[rb.category] || CATEGORY_COLORS.general}>
                        {rb.category}
                      </Badge>
                      {rb.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs gap-1">
                          <Tag className="h-3 w-3" /> {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleEdit(rb); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleOpenLink(rb); }}
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {selectedRunbook?.id === rb.id && (
                <CardContent>
                  <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap border-t border-border pt-4">
                    {rb.content}
                  </div>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated {format(new Date(rb.updated_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedRunbook ? "Edit Runbook" : "Create Runbook"}</DialogTitle>
            <DialogDescription>
              {selectedRunbook ? "Update the runbook details." : "Create a new operational runbook."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Title"
              value={editForm.title}
              onChange={(e) => setEditForm(p => ({ ...p, title: e.target.value }))}
            />
            <Select value={editForm.category} onValueChange={(v) => setEditForm(p => ({ ...p, category: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Content (Markdown supported)"
              value={editForm.content}
              onChange={(e) => setEditForm(p => ({ ...p, content: e.target.value }))}
              rows={12}
            />
            <Input
              placeholder="Tags (comma-separated)"
              value={editForm.tags}
              onChange={(e) => setEditForm(p => ({ ...p, tags: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!editForm.title}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link to Incidents Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Incident</DialogTitle>
            <DialogDescription>
              Associate this runbook with an incident for reference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {linkedIncidents.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Linked Incidents</p>
                {linkedIncidents.map(link => {
                  const inc = incidents.find(i => i.id === link.incident_id);
                  return (
                    <div key={link.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-3 w-3" />
                      {inc?.title || link.incident_id}
                      <Badge variant="outline" className="text-xs">{inc?.status || "unknown"}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
            {canEdit && (
              <div className="flex gap-2">
                <Select value={selectedIncidentId} onValueChange={setSelectedIncidentId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select incident..." />
                  </SelectTrigger>
                  <SelectContent>
                    {incidents
                      .filter(i => !linkedIncidents.some(l => l.incident_id === i.id))
                      .map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleLinkIncident} disabled={!selectedIncidentId}>Link</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
