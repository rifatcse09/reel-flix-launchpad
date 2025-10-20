import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  created_at: string;
  amount_cents: number;
  status: string;
  user_id: string;
}

interface ARPUChartProps {
  transactions: Transaction[];
}

export const ARPUChart = ({ transactions }: ARPUChartProps) => {
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);
  const { toast } = useToast();

  const processARPUData = () => {
    const successful = transactions.filter(t => t.status === 'active');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);

    // Group by day
    const dailyData = new Map<string, { revenue: number; users: Set<string> }>();
    
    successful.forEach(transaction => {
      const date = new Date(transaction.created_at);
      if (date < cutoffDate) return;
      
      const dateKey = date.toISOString().split('T')[0];
      const current = dailyData.get(dateKey) || { revenue: 0, users: new Set<string>() };
      
      current.revenue += transaction.amount_cents / 100;
      current.users.add(transaction.user_id);
      
      dailyData.set(dateKey, current);
    });

    const chartData = Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        arpu: data.users.size > 0 ? data.revenue / data.users.size : 0,
        revenue: data.revenue,
        users: data.users.size,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return chartData;
  };

  const data = processARPUData();
  const avgARPU = data.length > 0 
    ? data.reduce((sum, d) => sum + d.arpu, 0) / data.length 
    : 0;

  const exportToCSV = () => {
    const headers = ['Date', 'ARPU', 'Revenue', 'Users'];
    const csvData = data.map(d => [d.date, d.arpu.toFixed(2), d.revenue.toFixed(2), d.users]);
    const csv = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arpu-${timeRange}days-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Exported",
      description: "ARPU data exported to CSV",
    });
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>ARPU Trend</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
        <CardDescription>Average Revenue Per User over time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 justify-between items-center">
          <div className="flex gap-2">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                variant={timeRange === days ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(days as 7 | 30 | 90)}
              >
                {days}d
              </Button>
            ))}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Avg ARPU</p>
            <p className="text-lg font-bold text-primary">${avgARPU.toFixed(2)}</p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'ARPU']}
            />
            <Line 
              type="monotone" 
              dataKey="arpu" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
