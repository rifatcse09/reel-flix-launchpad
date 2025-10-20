import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface CTRTrendChartProps {
  notifications: Array<{
    created_at: string;
    clicks?: number;
    read_count?: number;
  }>;
}

export const CTRTrendChart = ({ notifications }: CTRTrendChartProps) => {
  // Generate 7-day CTR trend data
  const generateTrendData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayNotifs = notifications.filter(n => 
        n.created_at?.startsWith(date)
      );
      
      const totalClicks = dayNotifs.reduce((sum, n) => sum + (n.clicks || 0), 0);
      const totalReads = dayNotifs.reduce((sum, n) => sum + (n.read_count || 0), 0);
      const ctr = totalReads > 0 ? (totalClicks / totalReads) * 100 : 0;

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ctr: parseFloat(ctr.toFixed(1))
      };
    });
  };

  const trendData = generateTrendData();

  return (
    <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">CTR Trend (7 Days)</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={60}>
          <LineChart data={trendData}>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))' 
              }}
              formatter={(value: number) => [`${value}%`, 'CTR']}
            />
            <Line 
              type="monotone" 
              dataKey="ctr" 
              stroke="hsl(142, 76%, 36%)" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="text-xs text-muted-foreground mt-2">
          {trendData[trendData.length - 1]?.ctr > trendData[0]?.ctr ? '📈' : '📉'} 
          {' '}Last 7 days trend
        </div>
      </CardContent>
    </Card>
  );
};
