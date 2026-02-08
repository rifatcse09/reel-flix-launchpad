import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

interface FraudMarker {
  id: string;
  marker_type: string;
  severity: string;
  description: string;
  created_at: string;
  resolved_at: string | null;
}

interface FraudRiskBadgeProps {
  userId: string;
  showDetails?: boolean;
}

function calculateRiskScore(markers: FraudMarker[]): number {
  const unresolved = markers.filter(m => !m.resolved_at);
  if (unresolved.length === 0) return 0;

  const severityWeights: Record<string, number> = {
    critical: 40,
    high: 25,
    medium: 15,
    low: 5,
  };

  return Math.min(
    100,
    unresolved.reduce((sum, m) => sum + (severityWeights[m.severity] || 10), 0)
  );
}

function getRiskLevel(score: number): { label: string; color: string; icon: typeof ShieldCheck } {
  if (score === 0) return { label: 'Clean', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: ShieldCheck };
  if (score < 30) return { label: 'Low Risk', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertTriangle };
  if (score < 60) return { label: 'Medium Risk', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertTriangle };
  return { label: 'High Risk', color: 'bg-destructive/20 text-destructive border-destructive/30', icon: ShieldAlert };
}

export function FraudRiskBadge({ userId, showDetails = false }: FraudRiskBadgeProps) {
  const [markers, setMarkers] = useState<FraudMarker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarkers();
  }, [userId]);

  const loadMarkers = async () => {
    try {
      const { data, error } = await supabase
        .from('fraud_markers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMarkers((data as FraudMarker[]) || []);
    } catch {
      // Silently fail for badge display
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const score = calculateRiskScore(markers);
  const risk = getRiskLevel(score);
  const Icon = risk.icon;
  const unresolvedCount = markers.filter(m => !m.resolved_at).length;

  if (score === 0 && !showDetails) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`text-[10px] cursor-help ${risk.color}`}>
            <Icon className="h-3 w-3 mr-1" />
            {risk.label} ({score})
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">Risk Score: {score}/100</p>
            <p className="text-xs">{unresolvedCount} unresolved marker{unresolvedCount !== 1 ? 's' : ''}</p>
            {showDetails && markers.filter(m => !m.resolved_at).slice(0, 3).map(m => (
              <p key={m.id} className="text-xs text-muted-foreground">
                • {m.description}
              </p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { calculateRiskScore, getRiskLevel };
export type { FraudMarker };
