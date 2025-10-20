import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";

interface Subscription {
  status: string;
  created_at: string;
  ends_at: string | null;
}

interface SubscriptionsChartProps {
  subscriptions: Subscription[];
}

export const SubscriptionsChart = ({ subscriptions }: SubscriptionsChartProps) => {
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    setLastUpdate(new Date());
  }, [subscriptions]);

  const getTimeSinceUpdate = () => {
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    return diffMins === 1 ? '1m ago' : `${diffMins}m ago`;
  };

  const processChartData = () => {
    // Get last 30 days
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const chartData = last30Days.map(date => {
      const dateObj = new Date(date);
      
      // Count active subscriptions for this day
      const active = subscriptions.filter(sub => {
        const createdDate = new Date(sub.created_at);
        const endsDate = sub.ends_at ? new Date(sub.ends_at) : null;
        
        return sub.status === 'active' && 
               createdDate <= dateObj && 
               (!endsDate || endsDate >= dateObj);
      }).length;

      // Count expired/cancelled subscriptions for this day
      const expired = subscriptions.filter(sub => {
        const endsDate = sub.ends_at ? new Date(sub.ends_at) : null;
        
        return (sub.status === 'cancelled' || (endsDate && endsDate <= dateObj)) &&
               new Date(sub.created_at) <= dateObj;
      }).length;

      return {
        date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        active,
        expired,
      };
    });

    return chartData;
  };

  const data = processChartData();
  const currentActive = data[data.length - 1]?.active || 0;
  const currentExpired = data[data.length - 1]?.expired || 0;
  
  // Calculate retention goal
  const totalSubscriptions = currentActive + currentExpired;
  const retentionRate = totalSubscriptions > 0 ? (currentActive / totalSubscriptions) * 100 : 0;
  const retentionGoal = 95; // 95% retention goal

  return (
    <Card className="col-span-full animate-fade-in bg-gradient-to-br from-background to-background/50">
      <CardHeader>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Subscription Health (Last 30 Days)
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">
                Active vs Expired subscriptions over time
              </p>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Last updated: {getTimeSinceUpdate()}
              </span>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Active Now</p>
              <p className="text-2xl font-bold text-success">{currentActive}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Expired</p>
              <p className="text-2xl font-bold text-muted-foreground">{currentExpired}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Retention</p>
              <div className="flex items-center gap-2">
                <div className="relative w-12 h-12">
                  <svg className="transform -rotate-90" width="48" height="48">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - retentionRate / 100)}`}
                      className={retentionRate >= retentionGoal ? "text-success" : "text-warning"}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    {retentionRate.toFixed(0)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Goal: {retentionGoal}%</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar 
              dataKey="active" 
              fill="hsl(var(--primary))" 
              name="Active" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="expired" 
              fill="hsl(var(--muted))" 
              name="Expired" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
