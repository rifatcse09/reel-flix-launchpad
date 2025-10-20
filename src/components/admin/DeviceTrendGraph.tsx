import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Session {
  last_accessed_at: string;
  device_type: string;
}

interface DeviceTrendGraphProps {
  sessions: Session[];
}

export const DeviceTrendGraph = ({ sessions }: DeviceTrendGraphProps) => {
  const [timeRange, setTimeRange] = useState<30 | 90>(30);
  const { toast } = useToast();

  const processDeviceTrends = () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);

    // Group by day and device type
    const dailyData = new Map<string, { mobile: number; tablet: number; desktop: number; smart_tv: number }>();
    
    sessions.forEach(session => {
      const date = new Date(session.last_accessed_at);
      if (date < cutoffDate) return;
      
      const dateKey = date.toISOString().split('T')[0];
      const current = dailyData.get(dateKey) || { mobile: 0, tablet: 0, desktop: 0, smart_tv: 0 };
      
      const deviceType = session.device_type.toLowerCase() as 'mobile' | 'tablet' | 'desktop' | 'smart_tv';
      if (deviceType in current) {
        current[deviceType]++;
      }
      
      dailyData.set(dateKey, current);
    });

    // Convert to percentage
    const chartData = Array.from(dailyData.entries())
      .map(([date, counts]) => {
        const total = counts.mobile + counts.tablet + counts.desktop + counts.smart_tv;
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          Mobile: total > 0 ? Math.round((counts.mobile / total) * 100) : 0,
          Tablet: total > 0 ? Math.round((counts.tablet / total) * 100) : 0,
          Desktop: total > 0 ? Math.round((counts.desktop / total) * 100) : 0,
          'Smart TV': total > 0 ? Math.round((counts.smart_tv / total) * 100) : 0,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return chartData;
  };

  const data = processDeviceTrends();

  const exportToCSV = () => {
    const headers = ['Date', 'Mobile %', 'Tablet %', 'Desktop %', 'Smart TV %'];
    const csvData = data.map(d => [d.date, d.Mobile, d.Tablet, d.Desktop, d['Smart TV']]);
    const csv = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device-trends-${timeRange}days-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Exported",
      description: "Device trend data exported to CSV",
    });
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle>Device Mix Trends</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
        <CardDescription>How device usage distribution shifts over time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {[30, 90].map((days) => (
            <Button
              key={days}
              variant={timeRange === days ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(days as 30 | 90)}
            >
              {days} Days
            </Button>
          ))}
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              label={{ value: 'Usage %', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="Mobile" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="Tablet" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="Desktop" 
              stroke="#0070ba" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="Smart TV" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
          {data.length > 0 && (
            <>
              <div className="text-center p-2 bg-primary/10 rounded">
                <p className="text-xs text-muted-foreground">Mobile</p>
                <p className="text-lg font-bold text-primary">{data[data.length - 1]?.Mobile}%</p>
              </div>
              <div className="text-center p-2 bg-purple-500/10 rounded">
                <p className="text-xs text-muted-foreground">Tablet</p>
                <p className="text-lg font-bold text-purple-500">{data[data.length - 1]?.Tablet}%</p>
              </div>
              <div className="text-center p-2 bg-blue-500/10 rounded">
                <p className="text-xs text-muted-foreground">Desktop</p>
                <p className="text-lg font-bold text-blue-500">{data[data.length - 1]?.Desktop}%</p>
              </div>
              <div className="text-center p-2 bg-orange-500/10 rounded">
                <p className="text-xs text-muted-foreground">Smart TV</p>
                <p className="text-lg font-bold text-orange-500">{data[data.length - 1]?.['Smart TV']}%</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
