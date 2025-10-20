import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Transaction {
  created_at: string;
  amount_cents: number;
  status: string;
}

interface RevenueChartProps {
  transactions: Transaction[];
}

export const RevenueChart = ({ transactions }: RevenueChartProps) => {
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);

  // Process data for the chart
  const processChartData = () => {
    const successfulTransactions = transactions.filter(t => t.status === 'active');
    
    // Group by day
    const dailyRevenue = successfulTransactions.reduce((acc: any, transaction) => {
      const date = new Date(transaction.created_at).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += transaction.amount_cents / 100;
      return acc;
    }, {});

    // Convert to array and sort by date
    const chartData = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({
        date,
        revenue: Number(revenue),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-timeRange); // Dynamic time range

    return chartData;
  };

  const chartData = processChartData();

  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const avgRevenue = totalRevenue / (chartData.length || 1);

  return (
    <Card className="col-span-full animate-fade-in">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Revenue Trend
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Daily revenue breakdown showing payment flow
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button
                variant={timeRange === 7 ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(7)}
              >
                7 Days
              </Button>
              <Button
                variant={timeRange === 30 ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(30)}
              >
                30 Days
              </Button>
              <Button
                variant={timeRange === 90 ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(90)}
              >
                90 Days
              </Button>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Avg Daily</p>
              <p className="text-2xl font-bold text-primary">${avgRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
