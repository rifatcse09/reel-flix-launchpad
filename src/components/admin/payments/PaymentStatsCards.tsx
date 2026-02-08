import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CreditCard, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentStats {
  totalRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
}

interface PaymentStatsCardsProps {
  stats: PaymentStats;
  animatedRevenue: number;
  onFilterChange: (status: string) => void;
}

export const PaymentStatsCards = ({ stats, animatedRevenue, onFilterChange }: PaymentStatsCardsProps) => {
  const { toast } = useToast();

  const handleClick = (status: string, label: string) => {
    onFilterChange(status);
    toast({
      title: "Filter Applied",
      description: `Showing ${label}`,
    });
  };

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        className="cursor-pointer hover:shadow-[var(--shadow-elevated)] transition-all animate-fade-in"
        onClick={() => handleClick('all', 'all transactions')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">💰 Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">${animatedRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">From all successful payments</p>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer hover:shadow-[var(--shadow-elevated)] transition-all animate-fade-in"
        onClick={() => handleClick('active', 'successful payments only')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">✅ Successful Payments</CardTitle>
          <CreditCard className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{stats.successfulPayments}</div>
          <p className="text-xs text-muted-foreground">Active subscriptions</p>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer hover:shadow-[var(--shadow-elevated)] transition-all animate-fade-in"
        onClick={() => handleClick('cancelled', 'failed payments only')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">⚠️ Failed Payments</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{stats.failedPayments}</div>
          <p className="text-xs text-muted-foreground">Cancelled or failed</p>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer hover:shadow-[var(--shadow-elevated)] transition-all animate-fade-in"
        onClick={() => handleClick('pending', 'pending payments only')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">🔄 Pending Payments</CardTitle>
          <RefreshCw className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{stats.pendingPayments}</div>
          <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
        </CardContent>
      </Card>
    </div>
  );
};
