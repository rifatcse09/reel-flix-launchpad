import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, ShieldAlert, Clock } from "lucide-react";
import { format } from "date-fns";
import { calculateRiskScore, getRiskLevel, type FraudMarker } from "./FraudRiskBadge";

interface FraudMarkersPanelProps {
  userId: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive/20 text-destructive border-destructive/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const MARKER_TYPE_LABELS: Record<string, string> = {
  multi_account_ip: 'Multiple Accounts (Same IP)',
  repeated_failed_payments: 'Repeated Failed Payments',
  abnormal_signup_velocity: 'Abnormal Signup Velocity',
};

export function FraudMarkersPanel({ userId }: FraudMarkersPanelProps) {
  const { toast } = useToast();
  const [markers, setMarkers] = useState<FraudMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

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
    } catch (err) {
      console.error('Failed to load fraud markers:', err);
    } finally {
      setLoading(false);
    }
  };

  const resolveMarker = async (markerId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('fraud_markers')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: resolutionNote || 'Resolved by admin',
        })
        .eq('id', markerId);

      if (error) throw error;
      toast({ title: "Resolved", description: "Fraud marker resolved." });
      setResolvingId(null);
      setResolutionNote("");
      loadMarkers();
    } catch (err) {
      console.error('Failed to resolve marker:', err);
      toast({ title: "Error", description: "Failed to resolve marker.", variant: "destructive" });
    }
  };

  const score = calculateRiskScore(markers);
  const risk = getRiskLevel(score);
  const RiskIcon = risk.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Fraud Detection
          </div>
          <Badge variant="outline" className={`${risk.color}`}>
            <RiskIcon className="h-3 w-3 mr-1" />
            Score: {score}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : markers.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No fraud markers detected</p>
          </div>
        ) : (
          markers.map(marker => (
            <div key={marker.id} className={`border rounded-lg p-3 space-y-2 ${marker.resolved_at ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {MARKER_TYPE_LABELS[marker.marker_type] || marker.marker_type}
                  </span>
                </div>
                <Badge variant="outline" className={`text-[10px] ${SEVERITY_COLORS[marker.severity] || ''}`}>
                  {marker.severity}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{marker.description}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {format(new Date(marker.created_at), 'MMM d, yyyy HH:mm')}
              </div>

              {marker.resolved_at ? (
                <p className="text-[10px] text-emerald-400">
                  ✓ Resolved {format(new Date(marker.resolved_at), 'MMM d, yyyy')}
                </p>
              ) : resolvingId === marker.id ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Resolution notes..."
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    className="text-xs h-16"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setResolvingId(null); setResolutionNote(""); }}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => resolveMarker(marker.id)}>
                      Resolve
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setResolvingId(marker.id)}
                >
                  Resolve
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
