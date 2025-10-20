import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, TrendingUp, DollarSign } from "lucide-react";

interface Alert {
  id: string;
  code: string;
  label: string | null;
  type: 'revenue' | 'usage';
  value: number;
  timestamp: string;
}

export const AlertsWidget = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    checkForAlerts();
    
    // Check for alerts every 30 seconds
    const interval = setInterval(checkForAlerts, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkForAlerts = async () => {
    try {
      // Get all referral codes with their stats
      const { data: codes } = await supabase
        .from('referral_codes')
        .select('id, code, label, active');

      if (!codes) return;

      // Get uses per code
      const { data: uses } = await supabase
        .from('referral_uses')
        .select('code_id');

      // Get revenue per code
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('referral_code_id, amount_cents')
        .eq('status', 'paid');

      const newAlerts: Alert[] = [];
      const now = new Date().toISOString();

      // Define thresholds
      const revenueThresholds = [100, 500, 1000, 5000];
      const usageThresholds = [10, 50, 100, 500];

      codes.forEach(code => {
        if (!code.active) return;

        // Check usage
        const codeUses = uses?.filter(u => u.code_id === code.id).length || 0;
        usageThresholds.forEach(threshold => {
          if (codeUses >= threshold && codeUses < threshold + 5) {
            newAlerts.push({
              id: `${code.id}-usage-${threshold}`,
              code: code.code,
              label: code.label,
              type: 'usage',
              value: codeUses,
              timestamp: now
            });
          }
        });

        // Check revenue
        const codeRevenue = subscriptions
          ?.filter(s => s.referral_code_id === code.id)
          .reduce((sum, s) => sum + (s.amount_cents || 0), 0) || 0;
        const revenueDollars = codeRevenue / 100;
        
        revenueThresholds.forEach(threshold => {
          if (revenueDollars >= threshold && revenueDollars < threshold + 50) {
            newAlerts.push({
              id: `${code.id}-revenue-${threshold}`,
              code: code.code,
              label: code.label,
              type: 'revenue',
              value: revenueDollars,
              timestamp: now
            });
          }
        });
      });

      // Show toast for new alerts
      if (newAlerts.length > 0 && alerts.length === 0) {
        newAlerts.slice(0, 3).forEach(alert => {
          toast({
            title: alert.type === 'revenue' ? '🎉 Revenue Milestone!' : '🔥 Usage Milestone!',
            description: `Code ${alert.code} ${alert.label ? `(${alert.label})` : ''} reached ${
              alert.type === 'revenue' 
                ? `$${alert.value.toFixed(2)}` 
                : `${alert.value} uses`
            }`,
          });
        });
      }

      setAlerts(newAlerts.slice(0, 5));
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-pink-500/5 to-rose-500/5 border-pink-500/20 animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-pink-500 animate-pulse" />
          Active Milestones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border hover:bg-background transition-colors"
          >
            <div className="flex items-center gap-3">
              {alert.type === 'revenue' ? (
                <DollarSign className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-blue-500" />
              )}
              <div>
                <div className="font-mono font-bold">{alert.code}</div>
                {alert.label && (
                  <div className="text-xs text-muted-foreground">{alert.label}</div>
                )}
              </div>
            </div>
            <Badge 
              variant={alert.type === 'revenue' ? 'default' : 'secondary'}
              className="font-bold"
            >
              {alert.type === 'revenue' 
                ? `$${alert.value.toFixed(2)}` 
                : `${alert.value} uses`
              }
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
