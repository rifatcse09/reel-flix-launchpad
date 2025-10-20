import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CreditCard } from "lucide-react";

interface Transaction {
  processor: string;
  status: string;
  amount_cents: number;
}

interface ProcessorChartProps {
  transactions: Transaction[];
}

export const ProcessorChart = ({ transactions }: ProcessorChartProps) => {
  const processProcessorData = () => {
    const successfulTransactions = transactions.filter(t => t.status === 'active');
    
    const processorStats = successfulTransactions.reduce((acc: Record<string, { count: number; revenue: number }>, transaction) => {
      const processor = transaction.processor.toLowerCase();
      if (!acc[processor]) {
        acc[processor] = { count: 0, revenue: 0 };
      }
      acc[processor].count += 1;
      acc[processor].revenue += transaction.amount_cents / 100;
      return acc;
    }, {});

    const totalRevenue = Object.values(processorStats).reduce((sum, stat) => sum + stat.revenue, 0);

    return Object.entries(processorStats).map(([processor, stats]) => ({
      name: processor.charAt(0).toUpperCase() + processor.slice(1),
      value: stats.revenue,
      percentage: ((stats.revenue / totalRevenue) * 100).toFixed(1),
      count: stats.count,
    }));
  };

  const data = processProcessorData();

  const COLORS = {
    stripe: 'hsl(var(--primary))',
    paypal: '#0070ba',
    sensapay: '#8b5cf6',
  };

  const getColor = (name: string) => {
    const key = name.toLowerCase() as keyof typeof COLORS;
    return COLORS[key] || 'hsl(var(--muted))';
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Processor Performance
        </CardTitle>
        <p className="text-sm text-muted-foreground">Revenue distribution by payment processor</p>
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
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 w-full lg:w-auto">
              {data.map((entry, index) => (
                <div key={index} className="flex items-center justify-between gap-4">
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No processor data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};
