import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, FileText, Save, Clock, Shield, Phone, Target,
  History, Edit3, Eye
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type Section = "data_recovery" | "failover_plan" | "communication_plan" | "rto_rpo_targets";

interface DRDocument {
  id: string;
  section: string;
  title: string;
  content: string;
  version: number;
  is_current: boolean;
  edited_by: string;
  created_at: string;
  updated_at: string;
}

const SECTION_CONFIG: Record<Section, { label: string; icon: React.ElementType; description: string }> = {
  data_recovery: {
    label: "Data Recovery Procedure",
    icon: Shield,
    description: "Steps to recover data from backups in case of data loss or corruption.",
  },
  failover_plan: {
    label: "Failover Plan",
    icon: Target,
    description: "Procedures for switching to backup systems when primary systems fail.",
  },
  communication_plan: {
    label: "Communication Plan",
    icon: Phone,
    description: "How to communicate with stakeholders during a disaster event.",
  },
  rto_rpo_targets: {
    label: "RTO / RPO Targets",
    icon: Clock,
    description: "Recovery Time and Recovery Point Objectives for critical systems.",
  },
};

const SECTIONS: Section[] = ["data_recovery", "failover_plan", "communication_plan", "rto_rpo_targets"];

const DisasterRecovery = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { role } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Record<string, DRDocument[]>>({});
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState<Section | null>(null);

  const canEdit = role === "super_admin" || role === "admin";

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/dashboard/profile");
  }, [isAdmin, adminLoading, navigate]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("dr_documents")
        .select("*")
        .order("version", { ascending: false });
      if (error) throw error;

      const grouped: Record<string, DRDocument[]> = {};
      (data || []).forEach(doc => {
        if (!grouped[doc.section]) grouped[doc.section] = [];
        grouped[doc.section].push(doc);
      });
      setDocuments(grouped);

      const userIds = new Set<string>();
      (data || []).forEach(d => userIds.add(d.edited_by));
      if (userIds.size > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", Array.from(userIds));
        const map: Record<string, string> = {};
        (profs || []).forEach(p => { map[p.id] = p.full_name || p.email || p.id.slice(0, 8); });
        setProfiles(map);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load documents.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadDocuments();
  }, [isAdmin, loadDocuments]);

  const getCurrentDoc = (section: Section): DRDocument | undefined => {
    return (documents[section] || []).find(d => d.is_current);
  };

  const startEdit = (section: Section) => {
    const current = getCurrentDoc(section);
    setEditContent(current?.content || "");
    setEditingSection(section);
  };

  const handleSave = async () => {
    if (!editingSection) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const current = getCurrentDoc(editingSection);
      const newVersion = (current?.version || 0) + 1;

      // Mark old as not current
      if (current) {
        await supabase
          .from("dr_documents")
          .update({ is_current: false })
          .eq("id", current.id);
      }

      // Insert new version
      const { error } = await supabase.from("dr_documents").insert({
        section: editingSection,
        title: SECTION_CONFIG[editingSection].label,
        content: editContent,
        version: newVersion,
        is_current: true,
        edited_by: user.id,
      });
      if (error) throw error;

      toast({ title: "Saved", description: `Version ${newVersion} saved.` });
      setEditingSection(null);
      loadDocuments();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (adminLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Disaster Recovery
        </h1>
        <p className="text-muted-foreground">
          Recovery procedures and business continuity documentation
          {!canEdit && <span className="ml-2 text-xs">(Read-only — super_admin required to edit)</span>}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <Tabs defaultValue="data_recovery" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            {SECTIONS.map(s => {
              const config = SECTION_CONFIG[s];
              const Icon = config.icon;
              return (
                <TabsTrigger key={s} value={s} className="gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{config.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {SECTIONS.map(section => {
            const config = SECTION_CONFIG[section];
            const current = getCurrentDoc(section);
            const history = (documents[section] || []).filter(d => !d.is_current);
            const isEditing = editingSection === section;
            const Icon = config.icon;

            return (
              <TabsContent key={section} value={section} className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        {config.label}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {current && (
                          <Badge variant="outline" className="text-xs">v{current.version}</Badge>
                        )}
                        {history.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => setShowHistory(showHistory === section ? null : section)}
                          >
                            <History className="h-3 w-3" />
                            {history.length} version{history.length !== 1 ? "s" : ""}
                          </Button>
                        )}
                        {canEdit && !isEditing && (
                          <Button size="sm" onClick={() => startEdit(section)} className="gap-1.5 text-xs">
                            <Edit3 className="h-3 w-3" /> Edit
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={15}
                          className="font-mono text-sm"
                          placeholder={`Enter ${config.label} documentation...`}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save New Version
                          </Button>
                        </div>
                      </div>
                    ) : current ? (
                      <div className="space-y-3">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{current.content}</div>
                        <div className="text-xs text-muted-foreground border-t border-border pt-2">
                          Last edited by {profiles[current.edited_by] || "Admin"}{" "}
                          {formatDistanceToNow(new Date(current.updated_at), { addSuffix: true })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No documentation yet.</p>
                        {canEdit && (
                          <Button size="sm" onClick={() => startEdit(section)} className="mt-2 gap-1.5">
                            <Edit3 className="h-3 w-3" /> Create Document
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Version History */}
                {showHistory === section && history.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4" /> Version History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {history.map(doc => (
                        <div key={doc.id} className="p-3 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">v{doc.version}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(doc.created_at), "MMM d, yyyy HH:mm")} by{" "}
                              {profiles[doc.edited_by] || "Admin"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                            {doc.content}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
};

export default DisasterRecovery;
