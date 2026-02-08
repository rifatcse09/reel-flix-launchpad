import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, X } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { Link } from "react-router-dom";

export function CriticalIncidentBanner() {
  const { isAnyAdmin } = usePermissions();
  const [incidents, setIncidents] = useState<{ id: string; title: string; severity: string }[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAnyAdmin) return;

    const load = async () => {
      const { data } = await supabase
        .from("incidents")
        .select("id, title, severity")
        .eq("severity", "critical")
        .in("status", ["investigating", "identified", "monitoring"])
        .order("created_at", { ascending: false });
      setIncidents(data || []);
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [isAnyAdmin]);

  const visible = incidents.filter(i => !dismissed.has(i.id));
  if (!isAnyAdmin || visible.length === 0) return null;

  return (
    <div className="bg-red-500/10 border-b border-red-500/30">
      {visible.map(incident => (
        <div key={incident.id} className="flex items-center justify-between px-6 py-2">
          <Link
            to="/admin/incidents"
            className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
          >
            <AlertTriangle className="h-4 w-4 animate-pulse" />
            <span>CRITICAL: {incident.title}</span>
          </Link>
          <button
            onClick={() => setDismissed(prev => new Set([...prev, incident.id]))}
            className="text-red-400/60 hover:text-red-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
