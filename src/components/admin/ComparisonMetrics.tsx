import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricsData {
  totalRevenue: number;
  activeSubscribers: number;
  newSubscribers: number;
  churnRate: number;
}

interface ComparisonMetricsProps {
  current: MetricsData;
  previous: MetricsData;
  comparisonLabel: string;
}

export const ComparisonMetrics = ({ current, previous, comparisonLabel }: ComparisonMetricsProps) => {
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, isIncrease: false, isFlat: true, direction: 'flat' as const, absolute: current };
    const change = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(change),
      isIncrease: change > 0,
      isFlat: Math.abs(change) < 0.1,
      direction: (change > 0 ? 'increase' : change < 0 ? 'decrease' : 'flat') as 'increase' | 'decrease' | 'flat',
      absolute: current - previous,
    };
  };

  const revenueChange = calculateChange(current.totalRevenue, previous.totalRevenue);
  const subscribersChange = calculateChange(current.activeSubscribers, previous.activeSubscribers);
  const newSubsChange = calculateChange(current.newSubscribers, previous.newSubscribers);
  const churnChange = calculateChange(current.churnRate, previous.churnRate);

  const TrendIcon = ({ change }: { change: ReturnType<typeof calculateChange> }) => {
    if (change.isFlat) return <Minus className="h-4 w-4" />;
    return change.isIncrease ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const getTrendColor = (isGoodTrend: boolean, isFlat: boolean) => {
    if (isFlat) return "text-muted-foreground";
    return isGoodTrend ? "text-success" : "text-destructive";
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Comparison: {comparisonLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">${current.totalRevenue.toFixed(2)}</p>
            <div className={`flex items-center gap-1 text-sm ${getTrendColor(revenueChange.isIncrease, revenueChange.isFlat)}`}>
              <TrendIcon change={revenueChange} />
              <span>{revenueChange.percentage.toFixed(1)}%</span>
              {!revenueChange.isFlat && (
                <span className="text-xs text-muted-foreground">vs previous</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Previous: ${previous.totalRevenue.toFixed(2)} ({revenueChange.direction === 'increase' ? '+' : ''}${revenueChange.absolute.toFixed(2)})
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Active Subscribers</p>
            <p className="text-2xl font-bold">{current.activeSubscribers}</p>
            <div className={`flex items-center gap-1 text-sm ${getTrendColor(subscribersChange.isIncrease, subscribersChange.isFlat)}`}>
              <TrendIcon change={subscribersChange} />
              <span>{subscribersChange.percentage.toFixed(1)}%</span>
              {!subscribersChange.isFlat && (
                <span className="text-xs text-muted-foreground">vs previous</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Previous: {previous.activeSubscribers} ({subscribersChange.direction === 'increase' ? '+' : ''}{subscribersChange.absolute} users)
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">New Subscribers</p>
            <p className="text-2xl font-bold">{current.newSubscribers}</p>
            <div className={`flex items-center gap-1 text-sm ${getTrendColor(newSubsChange.isIncrease, newSubsChange.isFlat)}`}>
              <TrendIcon change={newSubsChange} />
              <span>{newSubsChange.percentage.toFixed(1)}%</span>
              {!newSubsChange.isFlat && (
                <span className="text-xs text-muted-foreground">vs previous</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Previous: {previous.newSubscribers} ({newSubsChange.direction === 'increase' ? '+' : ''}{newSubsChange.absolute} users)
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Churn Rate</p>
            <p className="text-2xl font-bold">{current.churnRate.toFixed(1)}%</p>
            <div className={`flex items-center gap-1 text-sm ${getTrendColor(!churnChange.isIncrease, churnChange.isFlat)}`}>
              <TrendIcon change={churnChange} />
              <span>{churnChange.percentage.toFixed(1)}%</span>
              {!churnChange.isFlat && (
                <span className="text-xs text-muted-foreground">vs previous</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Previous: {previous.churnRate.toFixed(1)}% ({churnChange.direction === 'increase' ? '+' : ''}{churnChange.absolute.toFixed(1)}%)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
