import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface LTVProjectionWidgetProps {
  arpu: number;
  churnRate: number;
  totalRevenue: number;
  totalUsers: number;
}

export const LTVProjectionWidget = ({ arpu, churnRate, totalRevenue, totalUsers }: LTVProjectionWidgetProps) => {
  const { toast } = useToast();
  
  // LTV = ARPU ÷ Churn Rate (as decimal)
  const churnDecimal = churnRate / 100;
  const ltv = churnDecimal > 0 ? arpu / churnDecimal : arpu * 12; // If no churn, estimate 1 year
  
  // Customer lifetime in months
  const avgLifetimeMonths = churnDecimal > 0 ? 1 / churnDecimal : 12;
  
  // Projected total LTV for all customers
  const totalProjectedLTV = ltv * totalUsers;

  const exportToJSON = () => {
    const data = {
      arpu,
      churnRate: churnRate.toFixed(2) + '%',
      ltv: ltv.toFixed(2),
      avgLifetimeMonths: avgLifetimeMonths.toFixed(1),
      totalUsers,
      totalProjectedLTV: totalProjectedLTV.toFixed(2),
      generatedAt: new Date().toISOString(),
    };
    
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ltv-projection-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    toast({
      title: "Exported",
      description: "LTV projection exported to JSON",
    });
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            LTV Projection
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={exportToJSON}>
            <Download className="h-4 w-4 mr-1" />
            JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 cursor-help">
                <p className="text-sm text-muted-foreground">Customer Lifetime Value</p>
                <p className="text-3xl font-bold text-primary">${ltv.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Per customer</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">LTV = ARPU ÷ Churn Rate</p>
              <p className="text-xs text-muted-foreground">${arpu.toFixed(2)} ÷ {churnRate.toFixed(1)}%</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">ARPU</p>
            <p className="text-xl font-bold">${arpu.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Churn Rate</p>
            <p className="text-xl font-bold">{churnRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className="pt-2 border-t space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Avg Lifetime</span>
            <span className="font-semibold">{avgLifetimeMonths.toFixed(1)} months</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Users</span>
            <span className="font-semibold">{totalUsers}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-medium">Projected Total LTV</span>
            <span className="font-bold text-primary">${totalProjectedLTV.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
