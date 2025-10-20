import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface RevenueForecastRingProps {
  currentRevenue: number;
  goalRevenue: number;
  label?: string;
}

export const RevenueForecastRing = ({ currentRevenue, goalRevenue, label = "Monthly Revenue Goal" }: RevenueForecastRingProps) => {
  const { toast } = useToast();
  const percentage = Math.min((currentRevenue / goalRevenue) * 100, 100);
  const remaining = Math.max(goalRevenue - currentRevenue, 0);
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const [shouldPulse, setShouldPulse] = React.useState(false);

  React.useEffect(() => {
    // Trigger pulse animation when percentage changes
    setShouldPulse(true);
    const timer = setTimeout(() => setShouldPulse(false), 1000);
    return () => clearTimeout(timer);
  }, [percentage]);

  const exportToJSON = () => {
    const data = {
      currentRevenue: currentRevenue.toFixed(2),
      goalRevenue: goalRevenue.toFixed(2),
      percentage: percentage.toFixed(1) + '%',
      remaining: remaining.toFixed(2),
      status: percentage >= 100 ? 'Goal Achieved' : 'In Progress',
      generatedAt: new Date().toISOString(),
    };
    
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-goal-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    toast({
      title: "Exported",
      description: "Revenue goal data exported to JSON",
    });
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>{label}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={exportToJSON}>
            <Download className="h-4 w-4 mr-1" />
            JSON
          </Button>
        </div>
        <CardDescription>Track progress toward your revenue target</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {/* Circular Progress Ring */}
        <div className={`relative w-64 h-64 ${shouldPulse ? 'animate-pulse' : ''}`}>
          <svg className="transform -rotate-90 w-full h-full">
            {/* Background circle */}
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              stroke="hsl(var(--muted))"
              strokeWidth="16"
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              stroke={percentage >= 100 ? "hsl(var(--success))" : "hsl(var(--primary))"}
              strokeWidth="16"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-5xl font-bold text-primary">{percentage.toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground mt-2">Complete</p>
          </div>
        </div>

        {/* Stats */}
        <div className="w-full mt-6 space-y-3">
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Current Revenue</span>
            <span className="text-lg font-bold text-primary">${currentRevenue.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Goal</span>
            <span className="text-lg font-bold">${goalRevenue.toFixed(2)}</span>
          </div>
          
          {remaining > 0 ? (
            <div className="flex justify-between items-center p-3 bg-warning/10 rounded-lg border border-warning/20">
              <span className="text-sm font-medium">Remaining</span>
              <span className="text-lg font-bold text-warning">${remaining.toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center p-3 bg-success/10 rounded-lg border border-success/20">
              <span className="text-sm font-bold text-success">🎉 Goal Achieved!</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
