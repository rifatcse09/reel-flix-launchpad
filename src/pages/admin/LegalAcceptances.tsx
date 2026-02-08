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
import { Loader2, Search, RefreshCw, FileCheck, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AcceptanceEntry {
  id: string;
  user_id: string;
  document_type: string;
  document_version: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
  user_email?: string;
}

const LegalAcceptances = () => {
  const { isAnyAdmin, loading: permLoading } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entries, setEntries] = useState<AcceptanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [docFilter, setDocFilter] = useState("all");

  useEffect(() => {
    if (!permLoading && !isAnyAdmin) navigate('/dashboard/profile');
  }, [isAnyAdmin, permLoading, navigate]);

  useEffect(() => {
    if (isAnyAdmin) loadAcceptances();
  }, [isAnyAdmin]);

  const loadAcceptances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('legal_acceptances')
        .select('*')
        .order('accepted_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      // Enrich with user emails from profiles
      const userIds = [...new Set((data || []).map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      setEntries((data || []).map(d => ({
        ...d,
        user_email: emailMap.get(d.user_id) || undefined,
      })) as AcceptanceEntry[]);
    } catch (err) {
      console.error('Failed to load acceptances:', err);
      toast({ title: "Error", description: "Failed to load legal acceptances.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const docTypes = [...new Set(entries.map(e => e.document_type))].sort();

  const filtered = entries.filter(e => {
    if (docFilter !== 'all' && e.document_type !== docFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        e.user_email?.toLowerCase().includes(s) ||
        e.user_id.toLowerCase().includes(s) ||
        e.document_version.toLowerCase().includes(s) ||
        e.ip_address?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['Accepted At', 'User Email', 'User ID', 'Document', 'Version', 'IP'];
    const rows = filtered.map(e => [
      format(new Date(e.accepted_at), 'yyyy-MM-dd HH:mm:ss'),
      e.user_email || '',
      e.user_id,
      e.document_type,
      e.document_version,
      e.ip_address || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legal-acceptances-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
            <FileCheck className="h-8 w-8 text-primary" />
            Legal Acceptances
          </h1>
          <p className="text-muted-foreground">Track ToS and Privacy Policy acceptance records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={loadAcceptances} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acceptance Records ({filtered.length})</CardTitle>
          <CardDescription>All user consent records with versions, timestamps, and IPs</CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, user ID, version, or IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={docFilter} onValueChange={setDocFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                {docTypes.map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
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
                  <TableHead>Accepted At</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No acceptance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(entry.accepted_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>
                          <span className="font-medium">{entry.user_email || 'Unknown'}</span>
                          <span className="block text-[10px] text-muted-foreground font-mono">
                            {entry.user_id.slice(0, 8)}…
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {entry.document_type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{entry.document_version}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {entry.ip_address || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalAcceptances;
