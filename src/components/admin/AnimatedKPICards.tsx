import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Percent, Activity } from "lucide-react";

interface KPIData {
  label: string;
  value: number;
  previousValue: number;
  format: 'currency' | 'number' | 'percentage';
  icon: 'revenue' | 'users' | 'arpu' | 'churn' | 'growth';
}

interface AnimatedKPICardsProps {
  kpis: KPIData[];
}

export const AnimatedKPICards = ({ kpis }: AnimatedKPICardsProps) => {
  const [animatedValues, setAnimatedValues] = useState<number[]>(kpis.map(() => 0));

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      setAnimatedValues(kpis.map(kpi => kpi.value * easeOutQuart));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [kpis]);

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'revenue': return DollarSign;
      case 'users': return Users;
      case 'arpu': return Target;
      case 'churn': return Percent;
      case 'growth': return Activity;
      default: return TrendingUp;
    }
  };

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return Math.round(value).toString();
    }
  };

  const getChangeData = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, isIncrease: false };
    const change = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(change),
      isIncrease: change > 0,
    };
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {kpis.map((kpi, index) => {
        const Icon = getIcon(kpi.icon);
        const change = getChangeData(kpi.value, kpi.previousValue);
        const isGoodTrend = kpi.icon === 'churn' ? !change.isIncrease : change.isIncrease;
        
        return (
          <Card
            key={index}
            className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
              isGoodTrend && change.percentage > 0
                ? 'shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                : !isGoodTrend && change.percentage > 0
                ? 'shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                : ''
            }`}
          >
            {/* Glow effect */}
            <div
              className={`absolute inset-0 opacity-10 ${
                isGoodTrend && change.percentage > 0
                  ? 'bg-success'
                  : !isGoodTrend && change.percentage > 0
                  ? 'bg-destructive'
                  : 'bg-muted'
              }`}
            />
            
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground font-medium">{kpi.label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="space-y-2">
                <p className="text-3xl font-bold tracking-tight">
                  {formatValue(animatedValues[index], kpi.format)}
                </p>
                
                {change.percentage > 0 && (
                  <div className="flex items-center gap-1">
                    {change.isIncrease ? (
                      <TrendingUp className={`h-4 w-4 ${isGoodTrend ? 'text-success' : 'text-destructive'}`} />
                    ) : (
                      <TrendingDown className={`h-4 w-4 ${isGoodTrend ? 'text-success' : 'text-destructive'}`} />
                    )}
                    <span className={`text-sm font-semibold ${isGoodTrend ? 'text-success' : 'text-destructive'}`}>
                      {change.percentage.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">vs previous</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
