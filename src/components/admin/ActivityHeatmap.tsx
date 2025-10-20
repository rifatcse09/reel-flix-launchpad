import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Session {
  last_accessed_at: string;
}

interface ActivityHeatmapProps {
  sessions: Session[];
}

export const ActivityHeatmap = ({ sessions }: ActivityHeatmapProps) => {
  const { toast } = useToast();

  const processHeatmapData = () => {
    const hourlyActivity = Array.from({ length: 24 }, () => Array(7).fill(0));
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    sessions.forEach(session => {
      const date = new Date(session.last_accessed_at);
      const hour = date.getHours();
      const day = date.getDay();
      hourlyActivity[hour][day]++;
    });

    // Find max for normalization
    const maxActivity = Math.max(...hourlyActivity.flat());

    return { hourlyActivity, maxActivity, days };
  };

  const { hourlyActivity, maxActivity, days } = processHeatmapData();

  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted';
    // Adaptive scaling: adjust based on actual data range
    const intensity = maxActivity > 0 ? (count / maxActivity) * 100 : 0;
    // Dynamic color scaling that adjusts to volume
    if (intensity < 20) return 'bg-primary/15';
    if (intensity < 40) return 'bg-primary/30';
    if (intensity < 60) return 'bg-primary/50';
    if (intensity < 80) return 'bg-primary/70';
    return 'bg-primary';
  };

  const exportToCSV = () => {
    const headers = ['Hour', ...days];
    const csvData = hourlyActivity.map((hourData, hour) => [
      `${hour}:00`,
      ...hourData
    ]);
    const csv = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-heatmap-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Exported",
      description: "Activity heatmap data exported to CSV",
    });
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Activity Heatmap</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
        <CardDescription>Peak usage times by day and hour</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Day labels */}
          <div className="flex gap-1 pl-12">
            {days.map((day, i) => (
              <div key={i} className="flex-1 text-center text-xs text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-1">
            {hourlyActivity.map((hourData, hour) => (
              <div key={hour} className="flex gap-1 items-center">
                <div className="w-10 text-right text-xs text-muted-foreground">
                  {hour}:00
                </div>
                {hourData.map((count, day) => (
                  <div
                    key={day}
                    className={`flex-1 h-6 rounded ${getColor(count)} transition-colors cursor-pointer hover:ring-2 hover:ring-primary`}
                    title={`${days[day]} ${hour}:00 - ${count} activities`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded bg-muted" />
              <div className="w-4 h-4 rounded bg-primary/20" />
              <div className="w-4 h-4 rounded bg-primary/40" />
              <div className="w-4 h-4 rounded bg-primary/60" />
              <div className="w-4 h-4 rounded bg-primary" />
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
