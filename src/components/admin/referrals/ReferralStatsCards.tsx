import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Ticket, TrendingUp, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReferralCode {
  id: string;
  code: string;
  active: boolean;
  revenue?: number;
  use_count?: number;
  [key: string]: any;
}

interface ReferralStatsCardsProps {
  referralCodes: ReferralCode[];
  totalRevenue: number;
  totalUses: number;
  activeCodes: number;
  avgRevenuePerCode: number;
  conversionRate: number;
  arpu: number;
  onSortChange: (sort: 'revenue' | 'uses' | 'none') => void;
  onStatusFilterChange: (filter: 'all' | 'active' | 'inactive') => void;
  onSearchChange: (query: string) => void;
}

export const ReferralStatsCards = ({
  referralCodes,
  totalRevenue,
  totalUses,
  activeCodes,
  avgRevenuePerCode,
  conversionRate,
  arpu,
  onSortChange,
  onStatusFilterChange,
  onSearchChange,
}: ReferralStatsCardsProps) => {
  const { toast } = useToast();

  return (
    <div className="grid gap-4 md:grid-cols-6">
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => {
          onSortChange('revenue');
          onStatusFilterChange('all');
          onSearchChange('');
          toast({ title: "Sorted by Revenue", description: "Showing codes by highest revenue first" });
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">From all referral codes</p>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => {
          onSortChange('uses');
          onStatusFilterChange('all');
          onSearchChange('');
          toast({ title: "Sorted by Usage", description: "Showing most used codes first" });
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUses}</div>
          <p className="text-xs text-muted-foreground">Total redemptions</p>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => {
          onStatusFilterChange('active');
          onSortChange('none');
          onSearchChange('');
          toast({ title: "Filter Applied", description: "Showing active codes only" });
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
          <Ticket className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeCodes}</div>
          <p className="text-xs text-muted-foreground">of {referralCodes.length} total</p>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => {
          onSortChange('revenue');
          onStatusFilterChange('all');
          onSearchChange('');
          toast({ title: "Sorted by Revenue", description: "Showing top performing codes" });
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${avgRevenuePerCode.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Per referral code</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">Avg uses per code</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ARPU</CardTitle>
          <DollarSign className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            ${arpu.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">Avg revenue per use</p>
        </CardContent>
      </Card>
    </div>
  );
};
