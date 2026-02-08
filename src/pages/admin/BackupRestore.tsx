import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Database, HardDrive, RefreshCw, CheckCircle2,
  AlertTriangle, Clock, Shield, ClipboardCheck
} from "lucide-react";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";

interface BackupEntry {
  id: string;
  backup_type: string;
  last_backup_at: string | null;
  backup_size_mb: number | null;
  retention_days: number;
  status: string;
  last_restore_test_at: string | null;
  last_restore_test_by: string | null;
  last_restore_test_notes: string | null;
  updated_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  database: { label: "Database", icon: Database },
  storage: { label: "File Storage", icon: HardDrive },
  full: { label: "Full System", icon: Shield },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  healthy: { label: "Healthy", color: "text-green-400", dotColor: "bg-green-500" },
  warning: { label: "Warning", color: "text-yellow-400", dotColor: "bg-yellow-500" },
  critical: { label: "Critical", color: "text-red-400", dotColor: "bg-red-500" },
  unknown: { label: "Unknown", color: "text-muted-foreground", dotColor: "bg-muted-foreground" },
};

const BackupRestore = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<BackupEntry[]>([]);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<BackupEntry | null>(null);
  const [testNotes, setTestNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/dashboard/profile");
  }, [isAdmin, adminLoading, navigate]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("backup_status")
        .select("*")
        .order("backup_type");
      if (error) throw error;
      setEntries(data || []);

      const userIds = new Set<string>();
      (data || []).forEach(e => {
        if (e.last_restore_test_by) userIds.add(e.last_restore_test_by);
      });
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
      toast({ title: "Error", description: "Failed to load backup status.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadEntries();
  }, [isAdmin, loadEntries]);

  const getBackupHealth = (entry: BackupEntry): string => {
    if (!entry.last_backup_at) return "unknown";
    const hoursSince = differenceInHours(new Date(), new Date(entry.last_backup_at));
    if (hoursSince > 48) return "critical";
    if (hoursSince > 24) return "warning";
    return "healthy";
  };

  const getRestoreHealth = (entry: BackupEntry): string => {
    if (!entry.last_restore_test_at) return "unknown";
    const hoursSince = differenceInHours(new Date(), new Date(entry.last_restore_test_at));
    if (hoursSince > 720) return "critical"; // >30 days
    if (hoursSince > 336) return "warning"; // >14 days
    return "healthy";
  };

  const handleMarkRestoreTest = async () => {
    if (!selectedEntry) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("backup_status")
        .update({
          last_restore_test_at: new Date().toISOString(),
          last_restore_test_by: user.id,
          last_restore_test_notes: testNotes.trim() || null,
        })
        .eq("id", selectedEntry.id);
      if (error) throw error;

      toast({ title: "Restore Test Recorded", description: "Restore test has been logged." });
      setTestDialogOpen(false);
      setTestNotes("");
      setSelectedEntry(null);
      loadEntries();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBackupTime = async (entry: BackupEntry) => {
    try {
      const { error } = await supabase
        .from("backup_status")
        .update({
          last_backup_at: new Date().toISOString(),
          status: "healthy",
        })
        .eq("id", entry.id);
      if (error) throw error;
      toast({ title: "Updated", description: `${TYPE_CONFIG[entry.backup_type]?.label || entry.backup_type} backup time updated.` });
      loadEntries();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const overallHealth = entries.some(e => getBackupHealth(e) === "critical" || getRestoreHealth(e) === "critical")
    ? "critical"
    : entries.some(e => getBackupHealth(e) === "warning" || getRestoreHealth(e) === "warning" || getBackupHealth(e) === "unknown")
    ? "warning"
    : "healthy";

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
            <Database className="h-8 w-8 text-primary" />
            Backup & Restore
          </h1>
          <p className="text-muted-foreground">Monitor backup health and restore test history</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusIndicator status={overallHealth} />
          <Button variant="outline" onClick={loadEntries} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Banner */}
      <Card className={`border ${
        overallHealth === "critical" ? "border-red-500/30 bg-red-500/5"
          : overallHealth === "warning" ? "border-yellow-500/30 bg-yellow-500/5"
          : "border-green-500/30 bg-green-500/5"
      }`}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${STATUS_CONFIG[overallHealth].dotColor} ${overallHealth !== "healthy" ? "animate-pulse" : ""}`} />
            <span className={`text-lg font-semibold ${STATUS_CONFIG[overallHealth].color}`}>
              {overallHealth === "critical" ? "Backup Attention Required"
                : overallHealth === "warning" ? "Some Items Need Attention"
                : "All Backups Healthy"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Backup Cards */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map(entry => {
            const typeConfig = TYPE_CONFIG[entry.backup_type] || { label: entry.backup_type, icon: Database };
            const Icon = typeConfig.icon;
            const backupHealth = getBackupHealth(entry);
            const restoreHealth = getRestoreHealth(entry);
            const bConfig = STATUS_CONFIG[backupHealth];
            const rConfig = STATUS_CONFIG[restoreHealth];

            return (
              <Card key={entry.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-5 w-5 text-primary" />
                    {typeConfig.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Backup Status */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Last Backup</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${bConfig.dotColor}`} />
                        <span className={`text-xs ${bConfig.color}`}>{bConfig.label}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.last_backup_at
                        ? formatDistanceToNow(new Date(entry.last_backup_at), { addSuffix: true })
                        : "No backup recorded"}
                    </p>
                    {entry.last_backup_at && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.last_backup_at), "MMM d, yyyy HH:mm")}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs w-full"
                      onClick={() => handleUpdateBackupTime(entry)}
                    >
                      <Clock className="h-3 w-3" /> Mark Backup Performed
                    </Button>
                  </div>

                  {/* Retention */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Retention Window</span>
                    <span className="font-medium">{entry.retention_days} days</span>
                  </div>

                  {/* Restore Test */}
                  <div className="space-y-2 border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Restore Test</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${rConfig.dotColor}`} />
                        <span className={`text-xs ${rConfig.color}`}>{rConfig.label}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.last_restore_test_at
                        ? formatDistanceToNow(new Date(entry.last_restore_test_at), { addSuffix: true })
                        : "Never tested"}
                    </p>
                    {entry.last_restore_test_by && (
                      <p className="text-xs text-muted-foreground">
                        By {profiles[entry.last_restore_test_by] || "Admin"}
                        {entry.last_restore_test_notes && ` — ${entry.last_restore_test_notes}`}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs w-full"
                      onClick={() => {
                        setSelectedEntry(entry);
                        setTestDialogOpen(true);
                      }}
                    >
                      <ClipboardCheck className="h-3 w-3" /> Mark Restore Test Performed
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Restore Test Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Restore Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirm that a restore test was performed for{" "}
              <strong>{selectedEntry ? TYPE_CONFIG[selectedEntry.backup_type]?.label : ""}</strong>.
            </p>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={testNotes}
                onChange={e => setTestNotes(e.target.value)}
                placeholder="Test results, issues found, etc."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTestDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleMarkRestoreTest} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirm Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function StatusIndicator({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
  return (
    <Badge className={`px-3 py-1 text-sm ${
      status === "healthy" ? "bg-green-500/20 text-green-400 border-green-500/30"
        : status === "warning" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        : status === "critical" ? "bg-red-500/20 text-red-400 border-red-500/30"
        : "bg-muted text-muted-foreground"
    }`}>
      {status === "healthy" ? "✓ ALL HEALTHY" : status === "warning" ? "⚡ WARNING" : status === "critical" ? "⚠️ CRITICAL" : "? UNKNOWN"}
    </Badge>
  );
}

export default BackupRestore;
