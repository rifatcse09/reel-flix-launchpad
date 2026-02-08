import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, RefreshCw, Download, ClipboardList, Shield, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ActivityEntry {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  view: 'bg-muted text-muted-foreground border-border',
  change: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  impersonation: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  refund: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  retry: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  role_change: 'bg-red-500/20 text-red-400 border-red-500/30',
  delete: 'bg-destructive/20 text-destructive border-destructive/30',
  export: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  denied: 'bg-destructive/30 text-destructive border-destructive/50',
};

const ACTION_ICONS: Record<string, typeof Shield> = {
  denied: AlertTriangle,
};

const StaffActivityLog = () => {
  const { isAnyAdmin, hasPermission, loading: permLoading } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  useEffect(() => {
    if (!permLoading && !isAnyAdmin) navigate('/dashboard/profile');
  }, [isAnyAdmin, permLoading, navigate]);

  useEffect(() => {
    if (isAnyAdmin) loadEntries();
  }, [isAnyAdmin]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setEntries((data as ActivityEntry[]) || []);
    } catch (err) {
      console.error('Failed to load staff activity:', err);
      toast({ title: "Error", description: "Failed to load staff activity log.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const actionTypes = [...new Set(entries.map(e => e.action_type))].sort();
  const entityTypes = [...new Set(entries.map(e => e.entity_type).filter(Boolean))].sort();

  const filtered = entries.filter(e => {
    if (actionFilter !== 'all' && e.action_type !== actionFilter) return false;
    if (entityFilter !== 'all' && e.entity_type !== entityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        e.admin_email?.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s) ||
        e.entity_id?.toLowerCase().includes(s) ||
        JSON.stringify(e.metadata).toLowerCase().includes(s)
      );
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['Timestamp', 'Admin', 'Action', 'Entity Type', 'Entity ID', 'Description', 'IP'];
    const rows = filtered.map(e => [
      format(new Date(e.created_at), 'yyyy-MM-dd HH:mm:ss'),
      e.admin_email || '',
      e.action_type,
      e.entity_type || '',
      e.entity_id || '',
      e.description.replace(/,/g, ';'),
      e.ip_address || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-activity-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAnyAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-primary" />
            Staff Activity Log
          </h1>
          <p className="text-muted-foreground">Track all admin actions, logins, and changes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={loadEntries} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({filtered.length})</CardTitle>
          <CardDescription>All staff actions with timestamps, entities, and metadata</CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by admin, description, entity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entityTypes.map(t => (
                  <SelectItem key={t!} value={t!}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No activity logged yet
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(entry => {
                    const Icon = ACTION_ICONS[entry.action_type];
                    return (
                      <TableRow key={entry.id} className={entry.action_type === 'denied' ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(entry.created_at), 'MMM d, HH:mm:ss')}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {entry.admin_email || entry.admin_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] capitalize ${ACTION_COLORS[entry.action_type] || ''}`}>
                            {Icon && <Icon className="h-3 w-3 mr-1 inline" />}
                            {entry.action_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {entry.entity_type && (
                            <span className="text-muted-foreground">
                              {entry.entity_type}
                              {entry.entity_id && (
                                <span className="font-mono ml-1 text-[10px]">
                                  {entry.entity_id.length > 8 ? entry.entity_id.slice(0, 8) + '…' : entry.entity_id}
                                </span>
                              )}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[300px] truncate">
                          {entry.description}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {entry.ip_address || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffActivityLog;
