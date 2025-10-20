import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

interface Subscription {
  status: string;
  created_at: string;
  ends_at: string | null;
}

interface SubscriptionsChartProps {
  subscriptions: Subscription[];
}

export const SubscriptionsChart = ({ subscriptions }: SubscriptionsChartProps) => {
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

  return (
    <Card className="col-span-full animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Subscription Health (Last 30 Days)
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Active vs Expired subscriptions over time
            </p>
          </div>
          <div className="text-right">
            <div className="flex gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Active Now</p>
                <p className="text-2xl font-bold text-success">{currentActive}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-muted-foreground">{currentExpired}</p>
              </div>
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
