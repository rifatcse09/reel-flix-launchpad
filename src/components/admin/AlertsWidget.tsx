import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Mail, AlertTriangle, DollarSign, Percent } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface AlertThreshold {
  id: string;
  label: string;
  icon: typeof DollarSign;
  enabled: boolean;
  threshold: string;
  condition: 'greater' | 'less';
  type: 'revenue' | 'churn' | 'subscribers';
}

export const AlertsWidget = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AlertThreshold[]>([
    {
      id: 'revenue-milestone',
      label: 'Revenue Milestone',
      icon: DollarSign,
      enabled: false,
      threshold: '1000',
      condition: 'greater',
      type: 'revenue',
    },
    {
      id: 'high-churn',
      label: 'High Churn Alert',
      icon: Percent,
      enabled: false,
      threshold: '5',
      condition: 'greater',
      type: 'churn',
    },
    {
      id: 'subscriber-drop',
      label: 'Subscriber Drop',
      icon: AlertTriangle,
      enabled: false,
      threshold: '10',
      condition: 'less',
      type: 'subscribers',
    },
  ]);

  const toggleAlert = (id: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, enabled: !alert.enabled } : alert
    ));
    
    const alert = alerts.find(a => a.id === id);
    if (alert) {
      toast({
        title: alert.enabled ? "Alert Disabled" : "Alert Enabled",
        description: `${alert.label} notifications ${alert.enabled ? 'turned off' : 'turned on'}`,
      });
    }
  };

  const updateThreshold = (id: string, value: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, threshold: value } : alert
    ));
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle>Alert Configuration</CardTitle>
        </div>
        <CardDescription>Set up notifications for important milestones and thresholds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <div 
              key={alert.id}
              className={`p-4 rounded-lg border transition-all ${
                alert.enabled 
                  ? 'bg-primary/5 border-primary/20' 
                  : 'bg-muted/30 border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${alert.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <Label htmlFor={alert.id} className="font-medium cursor-pointer">
                      {alert.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Notify when {alert.type} is {alert.condition === 'greater' ? 'above' : 'below'} threshold
                    </p>
                  </div>
                </div>
                <Switch
                  id={alert.id}
                  checked={alert.enabled}
                  onCheckedChange={() => toggleAlert(alert.id)}
                />
              </div>
              
              {alert.enabled && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Label className="text-sm">Threshold:</Label>
                  <Input
                    type="number"
                    value={alert.threshold}
                    onChange={(e) => updateThreshold(alert.id, e.target.value)}
                    className="w-24 h-8 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">
                    {alert.type === 'revenue' ? '$' : alert.type === 'churn' ? '%' : 'users'}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground flex-1">
              Alerts will be sent via email and in-app notifications when conditions are met
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
