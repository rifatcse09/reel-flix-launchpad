import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Subscription {
  created_at: string;
  status: string;
  user_id: string;
}

interface CohortRetentionChartProps {
  subscriptions: Subscription[];
}

export const CohortRetentionChart = ({ subscriptions }: CohortRetentionChartProps) => {
  const { toast } = useToast();

  const processCohortData = () => {
    // Group by signup month
    const cohorts = new Map<string, { users: Set<string>; retained: { [key: string]: number } }>();

    subscriptions.forEach(sub => {
      const signupDate = new Date(sub.created_at);
      const cohortKey = `${signupDate.getFullYear()}-${String(signupDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, { users: new Set(), retained: {} });
      }
      
      const cohort = cohorts.get(cohortKey)!;
      cohort.users.add(sub.user_id);
      
      // Track retention
      const now = new Date();
      const monthsActive = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      if (sub.status === 'active') {
        for (let i = 0; i <= monthsActive && i <= 6; i++) {
          cohort.retained[i] = (cohort.retained[i] || 0) + 1;
        }
      }
    });

    // Convert to array and calculate percentages
    const cohortData = Array.from(cohorts.entries())
      .map(([month, data]) => {
        const total = data.users.size;
        return {
          month,
          total,
          month0: 100, // Everyone starts at 100%
          month0Count: total,
          month1: total > 0 ? Math.round((data.retained[1] || 0) / total * 100) : 0,
          month1Count: data.retained[1] || 0,
          month2: total > 0 ? Math.round((data.retained[2] || 0) / total * 100) : 0,
          month2Count: data.retained[2] || 0,
          month3: total > 0 ? Math.round((data.retained[3] || 0) / total * 100) : 0,
          month3Count: data.retained[3] || 0,
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6); // Last 6 months

    return cohortData;
  };

  const data = processCohortData();

  const getColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-success text-success-foreground';
    if (percentage >= 60) return 'bg-primary text-primary-foreground';
    if (percentage >= 40) return 'bg-warning text-warning-foreground';
    if (percentage >= 20) return 'bg-destructive/60 text-white';
    return 'bg-muted text-muted-foreground';
  };

  const exportToCSV = () => {
    const headers = ['Cohort', 'Total Users', 'Month 0', 'Month 1', 'Month 2', 'Month 3'];
    const csvData = data.map(d => [d.month, d.total, d.month0, d.month1, d.month2, d.month3]);
    const csv = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cohort-retention-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Exported",
      description: "Cohort retention data exported to CSV",
    });
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Cohort Retention</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
        <CardDescription>Retention rates by signup month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Cohort</th>
                <th className="text-center p-2 font-medium">Users</th>
                <th className="text-center p-2 font-medium">M0</th>
                <th className="text-center p-2 font-medium">M1</th>
                <th className="text-center p-2 font-medium">M2</th>
                <th className="text-center p-2 font-medium">M3</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((cohort, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{cohort.month}</td>
                    <td className="text-center p-2">{cohort.total}</td>
                    <td className="p-2">
                      <div className={`rounded px-2 py-1 text-center text-xs font-medium ${getColor(cohort.month0)}`}>
                        <div>{cohort.month0}%</div>
                        <div className="text-[10px] opacity-70">{cohort.month0Count}/{cohort.total}</div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className={`rounded px-2 py-1 text-center text-xs font-medium ${getColor(cohort.month1)}`}>
                        <div>{cohort.month1}%</div>
                        <div className="text-[10px] opacity-70">{cohort.month1Count}/{cohort.total}</div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className={`rounded px-2 py-1 text-center text-xs font-medium ${getColor(cohort.month2)}`}>
                        <div>{cohort.month2}%</div>
                        <div className="text-[10px] opacity-70">{cohort.month2Count}/{cohort.total}</div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className={`rounded px-2 py-1 text-center text-xs font-medium ${getColor(cohort.month3)}`}>
                        <div>{cohort.month3}%</div>
                        <div className="text-[10px] opacity-70">{cohort.month3Count}/{cohort.total}</div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-muted-foreground">
                    No cohort data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">How to read:</span> M0 = signup month, M1 = 1 month later, etc. 
            Colors indicate retention strength: <span className="text-success font-medium">Green</span> (≥80%), 
            <span className="text-primary font-medium"> Blue</span> (≥60%), 
            <span className="text-warning font-medium"> Orange</span> (≥40%), 
            <span className="text-destructive font-medium"> Red</span> (&lt;40%)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
