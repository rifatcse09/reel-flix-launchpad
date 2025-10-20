import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Target, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface MetricsData {
  totalRevenue: number;
  previousRevenue: number;
  activeSubscribers: number;
  previousSubscribers: number;
  churnRate: number;
  previousChurn: number;
  arpu: number;
  previousArpu: number;
  revenueHistory?: number[];
  subscriberHistory?: number[];
  arpuHistory?: number[];
  churnHistory?: number[];
}

interface ExecutiveSummaryCardProps {
  data: MetricsData;
}

export const ExecutiveSummaryCard = ({ data }: ExecutiveSummaryCardProps) => {
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, isIncrease: false };
    const change = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(change),
      isIncrease: change > 0,
    };
  };

  const revenueChange = calculateChange(data.totalRevenue, data.previousRevenue);
  const subscriberChange = calculateChange(data.activeSubscribers, data.previousSubscribers);
  const churnChange = calculateChange(data.churnRate, data.previousChurn);
  const arpuChange = calculateChange(data.arpu, data.previousArpu);

  const getInsightIcon = (isGood: boolean) => {
    return isGood ? CheckCircle : AlertCircle;
  };

  const generateSparklineData = (history?: number[]) => {
    if (!history || history.length === 0) return [];
    return history.slice(-7).map((value, index) => ({ index, value }));
  };

  const insights = [
    {
      text: `Revenue ${revenueChange.isIncrease ? 'up' : 'down'} ${revenueChange.percentage.toFixed(1)}% vs last period`,
      icon: revenueChange.isIncrease ? TrendingUp : TrendingDown,
      color: revenueChange.isIncrease ? 'text-success' : 'text-destructive',
      bgColor: revenueChange.isIncrease ? 'bg-success/10' : 'bg-destructive/10',
      borderColor: revenueChange.isIncrease ? 'border-success/20' : 'border-destructive/20',
      sparklineData: generateSparklineData(data.revenueHistory),
    },
    {
      text: data.churnRate === 0 
        ? 'No churn detected (0%)' 
        : `Churn ${churnChange.isIncrease ? 'increased' : 'decreased'} to ${data.churnRate.toFixed(1)}%`,
      icon: data.churnRate === 0 ? CheckCircle : (churnChange.isIncrease ? AlertCircle : CheckCircle),
      color: data.churnRate === 0 ? 'text-success' : (churnChange.isIncrease ? 'text-destructive' : 'text-success'),
      bgColor: data.churnRate === 0 ? 'bg-success/10' : (churnChange.isIncrease ? 'bg-destructive/10' : 'bg-success/10'),
      borderColor: data.churnRate === 0 ? 'border-success/20' : (churnChange.isIncrease ? 'border-destructive/20' : 'border-success/20'),
      sparklineData: generateSparklineData(data.churnHistory),
    },
    {
      text: `Average revenue per user: $${data.arpu.toFixed(2)}`,
      icon: arpuChange.isIncrease ? TrendingUp : TrendingDown,
      color: arpuChange.isIncrease ? 'text-success' : 'text-warning',
      bgColor: arpuChange.isIncrease ? 'bg-success/10' : 'bg-warning/10',
      borderColor: arpuChange.isIncrease ? 'border-success/20' : 'border-warning/20',
      sparklineData: generateSparklineData(data.arpuHistory),
    },
    {
      text: `${data.activeSubscribers} active subscribers (${subscriberChange.isIncrease ? '+' : ''}${subscriberChange.percentage.toFixed(1)}%)`,
      icon: Users,
      color: subscriberChange.isIncrease ? 'text-success' : 'text-warning',
      bgColor: subscriberChange.isIncrease ? 'bg-success/10' : 'bg-warning/10',
      borderColor: subscriberChange.isIncrease ? 'border-success/20' : 'border-warning/20',
      sparklineData: generateSparklineData(data.subscriberHistory),
    },
  ];

  const getConfidenceBadge = () => {
    if (data.churnRate < 3) return { label: 'Excellent Confidence', color: 'bg-success/20 text-success border-success/20' };
    if (data.churnRate < 7) return { label: 'Good Confidence', color: 'bg-primary/20 text-primary border-primary/20' };
    if (data.churnRate < 12) return { label: 'Moderate Confidence', color: 'bg-warning/20 text-warning border-warning/20' };
    return { label: 'Needs Attention', color: 'bg-destructive/20 text-destructive border-destructive/20' };
  };

  const confidenceBadge = getConfidenceBadge();

  const overallHealth = () => {
    let score = 0;
    if (revenueChange.isIncrease) score += 25;
    if (!churnChange.isIncrease || data.churnRate === 0) score += 25;
    if (arpuChange.isIncrease) score += 25;
    if (subscriberChange.isIncrease) score += 25;

    if (score >= 75) return { label: 'Excellent', color: 'text-success', bgColor: 'bg-success/20' };
    if (score >= 50) return { label: 'Good', color: 'text-primary', bgColor: 'bg-primary/20' };
    if (score >= 25) return { label: 'Fair', color: 'text-warning', bgColor: 'bg-warning/20' };
    return { label: 'Needs Attention', color: 'text-destructive', bgColor: 'bg-destructive/20' };
  };

  const health = overallHealth();

  return (
    <Card className="animate-fade-in bg-gradient-to-br from-primary/5 to-background border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Executive Summary</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className={confidenceBadge.color}>
              {confidenceBadge.label}
            </Badge>
            <Badge variant="outline" className={`${health.bgColor} ${health.color} border-${health.color.replace('text-', '')}/20`}>
              <Target className="h-3 w-3 mr-1" />
              {health.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div
                key={index}
                className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${insight.bgColor} ${insight.borderColor} transition-all hover:scale-[1.02]`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Icon className={`h-5 w-5 ${insight.color}`} />
                  <p className="text-sm font-medium">{insight.text}</p>
                </div>
                {insight.sparklineData && insight.sparklineData.length > 0 && (
                  <div className="w-24 h-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={insight.sparklineData}>
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={insight.color.replace('text-', 'hsl(var(--')}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Key Metrics at a Glance</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="text-center p-2 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-sm font-bold text-primary">${data.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">ARPU</p>
              <p className="text-sm font-bold">${data.arpu.toFixed(2)}</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">Churn</p>
              <p className="text-sm font-bold">{data.churnRate.toFixed(1)}%</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">Subscribers</p>
              <p className="text-sm font-bold">{data.activeSubscribers}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
