import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { PieChart as PieChartIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  plan: string;
  amount_cents: number;
  status: string;
}

interface PlanMixChartProps {
  transactions: Transaction[];
}

export const PlanMixChart = ({ transactions }: PlanMixChartProps) => {
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

    return Object.entries(planStats).map(([plan, stats]) => ({
      name: plan.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      value: stats.revenue,
      percentage: ((stats.revenue / totalRevenue) * 100).toFixed(1),
      count: stats.count,
    }));
  };

  const data = processPlanData();

  const COLORS = {
    'professional': 'hsl(var(--primary))',
    'elite': '#0070ba',
    'basic': '#8b5cf6',
    'premium': '#f59e0b',
  };

  const getColor = (name: string) => {
    const key = name.toLowerCase().split(' ')[0] as keyof typeof COLORS;
    return COLORS[key] || 'hsl(var(--muted))';
  };

  const exportToCSV = () => {
    const headers = ['Plan', 'Revenue', 'Percentage', 'Subscribers'];
    const csvData = data.map(d => [d.name, d.value.toFixed(2), d.percentage + '%', d.count]);
    const csv = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-mix-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Exported",
      description: "Plan mix data exported to CSV",
    });
  };

  const exportToJSON = () => {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-mix-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    toast({
      title: "Exported",
      description: "Plan mix data exported to JSON",
    });
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            <CardTitle>Plan Mix Analysis</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={exportToJSON}>
              <Download className="h-4 w-4 mr-1" />
              JSON
            </Button>
          </div>
        </div>
        <CardDescription>Revenue distribution by subscription plan</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 w-full lg:w-auto">
              {data.map((entry, index) => (
                <div key={index} className="flex items-center justify-between gap-6 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getColor(entry.name) }}
                    />
                    <span className="text-sm font-medium">{entry.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{entry.percentage}%</p>
                    <p className="text-xs text-muted-foreground">${entry.value.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{entry.count} subs</p>
                  </div>
                </div>
              ))}
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
