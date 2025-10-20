import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  plan: string;
  amount_cents: number;
  status: string;
}

interface PlanGrowthTreeMapProps {
  transactions: Transaction[];
}

export const PlanGrowthTreeMap = ({ transactions }: PlanGrowthTreeMapProps) => {
  const { toast } = useToast();

  const processPlanData = () => {
    const successful = transactions.filter(t => t.status === 'active');
    
    const planStats = successful.reduce((acc: Record<string, { revenue: number; count: number }>, transaction) => {
      const plan = transaction.plan;
      if (!acc[plan]) {
        acc[plan] = { revenue: 0, count: 0 };
      }
      acc[plan].revenue += transaction.amount_cents / 100;
      acc[plan].count += 1;
      return acc;
    }, {});

    const totalRevenue = Object.values(planStats).reduce((sum, stat) => sum + stat.revenue, 0);

    const data = Object.entries(planStats)
      .map(([plan, stats]) => ({
        name: plan.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        revenue: stats.revenue,
        percentage: (stats.revenue / totalRevenue) * 100,
        count: stats.count,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return data;
  };

  const data = processPlanData();

  const getColor = (index: number) => {
    const colors = [
      'bg-primary text-primary-foreground',
      'bg-blue-500 text-white',
      'bg-purple-500 text-white',
      'bg-orange-500 text-white',
      'bg-green-500 text-white',
    ];
    return colors[index % colors.length];
  };

  const exportToCSV = () => {
    const headers = ['Plan', 'Revenue', 'Percentage', 'Subscribers'];
    const csvData = data.map(d => [d.name, d.revenue.toFixed(2), d.percentage.toFixed(1) + '%', d.count]);
    const csv = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-treemap-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Exported",
      description: "Plan growth data exported to CSV",
    });
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>Plan Revenue Concentration</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
        <CardDescription>Visual representation of revenue by plan size</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="space-y-3">
            {/* Tree map blocks */}
            <div className="grid grid-cols-4 gap-2" style={{ minHeight: '300px' }}>
              {data.map((plan, index) => {
                // Calculate relative size
                const maxPercentage = data[0].percentage;
                const relativeSize = (plan.percentage / maxPercentage);
                const colSpan = Math.max(1, Math.round(relativeSize * 4));
                const rowSpan = index === 0 ? 2 : 1;

                return (
                  <div
                    key={index}
                    className={`${getColor(index)} rounded-lg p-4 flex flex-col justify-between hover:scale-105 transition-transform cursor-pointer shadow-lg`}
                    style={{
                      gridColumn: `span ${Math.min(colSpan, 4)}`,
                      gridRow: `span ${rowSpan}`,
                    }}
                  >
                    <div>
                      <p className="font-bold text-lg">{plan.name}</p>
                      <p className="text-sm opacity-90">{plan.count} subscribers</p>
                    </div>
                    <div className="mt-2">
                      <p className="text-2xl font-bold">${plan.revenue.toFixed(0)}</p>
                      <p className="text-sm opacity-90">{plan.percentage.toFixed(1)}% of total</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Revenue Breakdown</p>
              <div className="space-y-2">
                {data.map((plan, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${getColor(index)}`} />
                      <span className="font-medium">{plan.name}</span>
                    </div>
                    <span className="text-muted-foreground">${plan.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No plan data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};
