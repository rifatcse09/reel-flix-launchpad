import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const ReferralUsageChart = () => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      // Get last 30 days of referral uses
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: uses, error } = await supabase
        .from('referral_uses')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const usageByDate: { [key: string]: number } = {};
      
      // Initialize all dates in range with 0
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateStr = date.toISOString().split('T')[0];
        usageByDate[dateStr] = 0;
      }

      // Count uses per date
      uses?.forEach(use => {
        const date = new Date(use.created_at).toISOString().split('T')[0];
        if (usageByDate.hasOwnProperty(date)) {
          usageByDate[date]++;
        }
      });

      // Convert to chart format
      const data = Object.entries(usageByDate).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        uses: count
      }));

      setChartData(data);
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalUses = chartData.reduce((sum, item) => sum + item.uses, 0);
  const avgDailyUses = chartData.length > 0 ? (totalUses / chartData.length).toFixed(1) : '0';

  return (
    <Card className="bg-gradient-to-br from-background to-background/50 animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Referral Uses Over Time</CardTitle>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            Last updated: {lastUpdate} 🔄
          </span>
        </div>
        <p className="text-sm text-muted-foreground">Last 30 days of activity</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No usage data available yet
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20">
                <div className="text-xs text-muted-foreground">Total Uses (30d)</div>
                <div className="text-xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                  {totalUses}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
                <div className="text-xs text-muted-foreground">Avg Daily Uses</div>
                <div className="text-xl font-bold bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">
                  {avgDailyUses}
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => [value, 'Uses']}
                />
                <Line 
                  type="monotone" 
                  dataKey="uses" 
                  stroke="hsl(330, 80%, 60%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(330, 80%, 60%)', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
};
