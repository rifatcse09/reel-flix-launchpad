import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useState } from "react";

interface ReferralCode {
  code: string;
  label: string | null;
  revenue?: number;
  use_count?: number;
}

interface ReferralRevenueChartProps {
  referralCodes: ReferralCode[];
}

export const ReferralRevenueChart = ({ referralCodes }: ReferralRevenueChartProps) => {
  const [lastUpdate] = useState(new Date().toLocaleTimeString());

  // Get top 10 codes by revenue
  const chartData = referralCodes
    .filter(code => (code.revenue || 0) > 0)
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 10)
    .map(code => ({
      name: code.label || code.code,
      revenue: code.revenue || 0,
      uses: code.use_count || 0
    }));

  // Generate gradient pink colors
  const getColor = (index: number, total: number) => {
    const intensity = 1 - (index / total) * 0.5;
    return `hsl(330, 80%, ${50 + intensity * 20}%)`;
  };

  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <Card className="bg-gradient-to-br from-background to-background/50 animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Revenue by Referral Code</CardTitle>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            Last updated: {lastUpdate} 🔄
          </span>
        </div>
        <p className="text-sm text-muted-foreground">Top 10 performing codes</p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No revenue data available yet
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20">
              <div className="text-sm text-muted-foreground">Total Revenue (Top 10)</div>
              <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                ${totalRevenue.toFixed(2)}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'revenue') return [`$${value.toFixed(2)}`, 'Revenue'];
                    if (name === 'uses') return [value, 'Uses'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(index, chartData.length)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
};
