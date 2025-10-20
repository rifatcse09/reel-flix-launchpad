import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RevenueGoalWidgetProps {
  currentRevenue: number;
  goalRevenue?: number;
}

export const RevenueGoalWidget = ({ currentRevenue, goalRevenue = 5000 }: RevenueGoalWidgetProps) => {
  const percentage = Math.min((currentRevenue / goalRevenue) * 100, 100);
  const remaining = Math.max(goalRevenue - currentRevenue, 0);
  
  // Calculate projected completion
  const daysInMonth = 30;
  const currentDay = new Date().getDate();
  const dailyAverage = currentRevenue / currentDay;
  const projectedRevenue = dailyAverage * daysInMonth;
  const daysToGoal = remaining > 0 ? Math.ceil(remaining / dailyAverage) : 0;
  
  const getForecastMessage = () => {
    if (percentage >= 100) {
      return "Goal achieved! 🎉";
    }
    if (projectedRevenue >= goalRevenue) {
      return `Projected completion in ${daysToGoal} days at current pace`;
    }
    return `At current pace, projected to reach $${projectedRevenue.toFixed(2)} this month`;
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Monthly Revenue Goal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-bold text-primary">{percentage.toFixed(1)}%</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <Progress value={percentage} className="h-3" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{getForecastMessage()}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="text-2xl font-bold text-primary">${currentRevenue.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Goal</p>
            <p className="text-2xl font-bold">${goalRevenue.toFixed(2)}</p>
          </div>
        </div>

        {remaining > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              ${remaining.toFixed(2)} remaining to reach goal
            </p>
          </div>
        )}

        {percentage >= 100 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-success font-medium">
              🎉 Goal achieved! Outstanding performance!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
