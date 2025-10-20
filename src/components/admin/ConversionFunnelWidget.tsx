import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, CheckCircle2, Users, DollarSign } from "lucide-react";

interface ConversionFunnelWidgetProps {
  totalCodes: number;
  activeCodes: number;
  totalUses: number;
  paidConversions: number;
  totalRevenue: number;
}

export const ConversionFunnelWidget = ({ 
  totalCodes, 
  activeCodes, 
  totalUses, 
  paidConversions,
  totalRevenue 
}: ConversionFunnelWidgetProps) => {
  // Calculate conversion rates
  const activeRate = totalCodes > 0 ? (activeCodes / totalCodes) * 100 : 0;
  const usageRate = activeCodes > 0 ? (totalUses / activeCodes) * 100 : 0;
  const conversionRate = totalUses > 0 ? (paidConversions / totalUses) * 100 : 0;

  const stages = [
    {
      label: "Total Codes Created",
      value: totalCodes,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      percentage: 100,
    },
    {
      label: "Active Codes",
      value: activeCodes,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      percentage: activeRate,
    },
    {
      label: "Total Redemptions",
      value: totalUses,
      icon: TrendingDown,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      percentage: usageRate,
    },
    {
      label: "Paid Conversions",
      value: paidConversions,
      icon: DollarSign,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
      percentage: conversionRate,
    },
  ];

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Conversion Funnel
        </CardTitle>
        <p className="text-sm text-muted-foreground">From code creation to revenue</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <div key={stage.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stage.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stage.color}`} />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{stage.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {index > 0 && `${stage.percentage.toFixed(1)}% of previous stage`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{stage.value}</div>
                  {index === 3 && (
                    <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                      ${totalRevenue.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
              {index < stages.length - 1 && (
                <div className="ml-12 space-y-1">
                  <Progress 
                    value={stage.percentage} 
                    className="h-2"
                    style={
                      {
                        '--progress-color': stage.color.replace('text-', 'hsl(var(--') + '))'
                      } as React.CSSProperties
                    }
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Drop-off: {(100 - stages[index + 1].percentage).toFixed(1)}%</span>
                    <span>{stages[index + 1].percentage.toFixed(1)}% proceed</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Conversion Rate</span>
            <span className="text-lg font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
              {conversionRate.toFixed(2)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
