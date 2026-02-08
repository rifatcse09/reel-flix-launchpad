import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FileCheck, Clock } from "lucide-react";
import { format } from "date-fns";

interface AcceptanceRecord {
  id: string;
  document_type: string;
  document_version: string;
  accepted_at: string;
  ip_address: string | null;
}

interface LegalAcceptanceTabProps {
  userId: string;
}

export function LegalAcceptanceTab({ userId }: LegalAcceptanceTabProps) {
  const [records, setRecords] = useState<AcceptanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [userId]);

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_acceptances')
        .select('*')
        .eq('user_id', userId)
        .order('accepted_at', { ascending: false });
      if (error) throw error;
      setRecords((data as AcceptanceRecord[]) || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="text-xs text-muted-foreground py-4">Loading…</p>;

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No legal acceptance records</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map(r => (
        <div key={r.id} className="border rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] capitalize">
              {r.document_type.replace(/_/g, ' ')}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-mono">v{r.document_version}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(new Date(r.accepted_at), 'MMM d, yyyy HH:mm')}
          </div>
          {r.ip_address && (
            <p className="text-[10px] text-muted-foreground font-mono">IP: {r.ip_address}</p>
          )}
        </div>
      ))}
    </div>
  );
}
