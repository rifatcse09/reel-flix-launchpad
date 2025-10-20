import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Users, DollarSign, MousePointerClick, Percent, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReferrerPortfolioDrawer } from "./ReferrerPortfolioDrawer";
import { CommissionManagementDialog } from "./CommissionManagementDialog";
import { PayoutDialog } from "./PayoutDialog";

interface ReferrerStats {
  creator_id: string;
  creator_name: string;
  total_codes: number;
  active_codes: number;
  total_clicks: number;
  total_uses: number;
  total_revenue: number;
  conversion_rate: number;
  ctr: number;
  commission_rate: number;
  total_earned: number;
  total_paid: number;
  pending_payout: number;
}

export const ReferrerDashboard = () => {
  const [referrers, setReferrers] = useState<ReferrerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferrer, setSelectedReferrer] = useState<{ id: string; name: string } | null>(null);
  const [commissionDialog, setCommissionDialog] = useState<{ open: boolean; referrerId: string; name: string; rate: number } | null>(null);
  const [payoutDialog, setPayoutDialog] = useState<{ open: boolean; referrerId: string; name: string; pending: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadReferrerStats();
  }, []);

  const loadReferrerStats = async () => {
    try {
      setLoading(true);

      // Get all referral codes with creator info
      const { data: codes, error: codesError } = await supabase
        .from('referral_codes')
        .select('id, created_by, active');

      if (codesError) throw codesError;

      // Get creator names
      const creatorIds = [...new Set(codes?.map(c => c.created_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds);

      // Get clicks per code
      const { data: clicks } = await supabase
        .from('referral_clicks')
        .select('code_id');

      // Get uses per code
      const { data: uses } = await supabase
        .from('referral_uses')
        .select('code_id');

      // Get revenue per code
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('referral_code_id, amount_cents')
        .eq('status', 'paid');

      // Get commission info
      const { data: commissions } = await supabase
        .from('referrer_commissions')
        .select('referrer_id, commission_rate, total_earned_cents, total_paid_cents, pending_cents');

      // Aggregate stats by creator
      const statsMap = new Map<string, ReferrerStats>();

      codes?.forEach(code => {
        const creatorId = code.created_by || 'system';
        const creatorName = profiles?.find(p => p.id === creatorId)?.full_name || 'System';

        if (!statsMap.has(creatorId)) {
          const commission = commissions?.find(c => c.referrer_id === creatorId);
          statsMap.set(creatorId, {
            creator_id: creatorId,
            creator_name: creatorName,
            total_codes: 0,
            active_codes: 0,
            total_clicks: 0,
            total_uses: 0,
            total_revenue: 0,
            conversion_rate: 0,
            ctr: 0,
            commission_rate: commission?.commission_rate || 10,
            total_earned: (commission?.total_earned_cents || 0) / 100,
            total_paid: (commission?.total_paid_cents || 0) / 100,
            pending_payout: (commission?.pending_cents || 0) / 100
          });
        }

        const stats = statsMap.get(creatorId)!;
        stats.total_codes++;
        if (code.active) stats.active_codes++;

        // Count clicks for this code
        const codeClicks = clicks?.filter(c => c.code_id === code.id).length || 0;
        stats.total_clicks += codeClicks;

        // Count uses for this code
        const codeUses = uses?.filter(u => u.code_id === code.id).length || 0;
        stats.total_uses += codeUses;

        // Sum revenue for this code
        const codeRevenue = subscriptions
          ?.filter(s => s.referral_code_id === code.id)
          .reduce((sum, s) => sum + (s.amount_cents || 0), 0) || 0;
        stats.total_revenue += codeRevenue / 100;
      });

      // Calculate rates
      statsMap.forEach(stats => {
        stats.conversion_rate = stats.total_clicks > 0 
          ? (stats.total_uses / stats.total_clicks) * 100 
          : 0;
        stats.ctr = stats.total_codes > 0
          ? (stats.total_clicks / stats.total_codes)
          : 0;
      });

      const referrersList = Array.from(statsMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue);

      setReferrers(referrersList);
    } catch (error) {
      console.error('Error loading referrer stats:', error);
      toast({
        title: "Error",
        description: "Failed to load referrer statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalReferrers = referrers.length;
  const totalRevenue = referrers.reduce((sum, r) => sum + r.total_revenue, 0);
  const avgRevenuePerReferrer = totalReferrers > 0 ? totalRevenue / totalReferrers : 0;
  const topReferrer = referrers[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Referrer Performance Dashboard</h2>
        <p className="text-muted-foreground">Track affiliate and partner performance</p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrers}</div>
            <p className="text-xs text-muted-foreground">
              Active partners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From all referrers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Referrer</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgRevenuePerReferrer.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Average revenue
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <MousePointerClick className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-pink-500">{topReferrer?.creator_name || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              ${topReferrer?.total_revenue.toFixed(2) || '0.00'} revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referrer Table */}
      <Card>
        <CardHeader>
          <CardTitle>Referrer Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Referrer</TableHead>
                <TableHead>Codes</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Conv. Rate</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Earned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrers.map((referrer, index) => (
                <TableRow 
                  key={referrer.creator_id} 
                  className="hover:bg-muted/50 transition-colors duration-200"
                >
                  <TableCell>
                    <Badge variant={index === 0 ? "default" : "outline"}>
                      #{index + 1}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className="cursor-pointer hover:text-primary"
                    onClick={() => setSelectedReferrer({ id: referrer.creator_id, name: referrer.creator_name })}
                  >
                    <div className="font-medium">{referrer.creator_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {referrer.active_codes}/{referrer.total_codes} active
                    </div>
                  </TableCell>
                  <TableCell>{referrer.total_codes}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                      {referrer.total_clicks}
                    </div>
                  </TableCell>
                  <TableCell>{referrer.total_uses}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={referrer.conversion_rate > 50 ? "default" : "secondary"}
                      className="font-mono"
                    >
                      {referrer.conversion_rate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Percent className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{referrer.commission_rate.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-bold text-green-600 dark:text-green-400">
                        ${referrer.total_earned.toFixed(2)}
                      </div>
                      {referrer.pending_payout > 0 && (
                        <div className="text-xs text-orange-600 dark:text-orange-400">
                          ${referrer.pending_payout.toFixed(2)} pending
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCommissionDialog({
                          open: true,
                          referrerId: referrer.creator_id,
                          name: referrer.creator_name,
                          rate: referrer.commission_rate
                        })}
                      >
                        <Percent className="h-3 w-3" />
                      </Button>
                      {referrer.pending_payout > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPayoutDialog({
                            open: true,
                            referrerId: referrer.creator_id,
                            name: referrer.creator_name,
                            pending: referrer.pending_payout * 100
                          })}
                        >
                          <Wallet className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Portfolio Drawer */}
      <ReferrerPortfolioDrawer
        open={!!selectedReferrer}
        onOpenChange={(open) => !open && setSelectedReferrer(null)}
        creatorId={selectedReferrer?.id || ''}
        creatorName={selectedReferrer?.name || ''}
      />

      {/* Commission Dialog */}
      {commissionDialog && (
        <CommissionManagementDialog
          open={commissionDialog.open}
          onOpenChange={(open) => !open && setCommissionDialog(null)}
          referrerId={commissionDialog.referrerId}
          referrerName={commissionDialog.name}
          currentRate={commissionDialog.rate}
          onSuccess={loadReferrerStats}
        />
      )}

      {/* Payout Dialog */}
      {payoutDialog && (
        <PayoutDialog
          open={payoutDialog.open}
          onOpenChange={(open) => !open && setPayoutDialog(null)}
          referrerId={payoutDialog.referrerId}
          referrerName={payoutDialog.name}
          pendingAmount={payoutDialog.pending}
          onSuccess={loadReferrerStats}
        />
      )}
    </div>
  );
};
