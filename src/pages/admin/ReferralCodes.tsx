import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileDown } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ReferralRevenueChart } from "@/components/admin/ReferralRevenueChart";
import { ReferralUsageChart } from "@/components/admin/ReferralUsageChart";
import { ReferralLeaderboard } from "@/components/admin/ReferralLeaderboard";
import { ConversionFunnelWidget } from "@/components/admin/ConversionFunnelWidget";
import { ReferrerDashboard } from "@/components/admin/ReferrerDashboard";
import { AlertsWidget } from "@/components/admin/AlertsWidget";
import { ReferralStatsCards } from "@/components/admin/referrals/ReferralStatsCards";
import { ReferralCodesTable, ReferralCode } from "@/components/admin/referrals/ReferralCodesTable";
import { CreateReferralCodeDialog } from "@/components/admin/referrals/CreateReferralCodeDialog";
import { ReferralDetailSheet } from "@/components/admin/referrals/ReferralDetailSheet";
import { exportReferralCSV, exportReferralPDF } from "@/components/admin/referrals/ReferralExportService";

const AdminReferralCodes = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'revenue' | 'uses' | 'none'>('none');
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<ReferralCode | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) loadReferralCodes();
  }, [isAdmin]);

  const loadReferralCodes = useCallback(async () => {
    try {
      const { data: codes, error } = await supabase
        .from('referral_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const creatorIds = codes?.map(code => code.created_by).filter(Boolean) || [];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', creatorIds);
      const { data: uses } = await supabase.from('referral_uses').select('code_id');
      const { data: clicks } = await supabase.from('referral_clicks').select('code_id');
      const { data: subs } = await supabase.from('subscriptions').select('referral_code_id, amount_cents').eq('status', 'paid');

      const codesWithCounts = codes?.map(code => ({
        ...code,
        use_count: uses?.filter(u => u.code_id === code.id).length || 0,
        click_count: clicks?.filter(c => c.code_id === code.id).length || 0,
        revenue: (subs?.filter(s => s.referral_code_id === code.id).reduce((sum, s) => sum + (s.amount_cents || 0), 0) || 0) / 100,
        creator_name: profiles?.find(p => p.id === code.created_by)?.full_name || 'System',
      })) || [];

      setReferralCodes(codesWithCounts);
    } catch (error) {
      console.error('Error loading referral codes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCode = async (codeId: string, codeName: string) => {
    if (!confirm(`Are you sure you want to delete referral code ${codeName}? This action cannot be undone.`)) return;

    try {
      await supabase.from('subscriptions').update({ referral_code_id: null }).eq('referral_code_id', codeId);
      await supabase.from('referral_uses').delete().eq('code_id', codeId);
      await supabase.from('referral_clicks').delete().eq('code_id', codeId);
      await supabase.from('referral_alert_thresholds').delete().eq('code_id', codeId);

      const { error } = await supabase.from('referral_codes').delete().eq('id', codeId);
      if (error) throw error;

      toast({ title: "Success", description: `Referral code ${codeName} deleted successfully` });
      await loadReferralCodes();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete referral code", variant: "destructive" });
    }
  };

  const viewDetails = async (code: ReferralCode) => {
    setSelectedCode(code);
    setIsDetailSheetOpen(true);

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('referral_code_id', code.id)
        .in('status', ['active', 'paid'])
        .order('paid_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load subscriptions: " + error.message, variant: "destructive" });
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const filteredCodes = referralCodes
    .filter(code => {
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && code.active) ||
        (statusFilter === 'inactive' && !code.active);
      const matchesSearch = code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (code.label?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'revenue') return (b.revenue || 0) - (a.revenue || 0);
      if (sortBy === 'uses') return (b.use_count || 0) - (a.use_count || 0);
      return 0;
    });

  const totalRevenue = referralCodes.reduce((sum, c) => sum + (c.revenue || 0), 0);
  const totalUses = referralCodes.reduce((sum, c) => sum + (c.use_count || 0), 0);
  const activeCodes = referralCodes.filter(c => c.active).length;
  const avgRevenuePerCode = referralCodes.length > 0 ? totalRevenue / referralCodes.length : 0;
  const conversionRate = referralCodes.length > 0 ? (totalUses / referralCodes.length) * 100 : 0;
  const arpu = totalUses > 0 ? totalRevenue / totalUses : 0;
  const paidConversions = totalUses;

  const handleExportCSV = () => {
    exportReferralCSV(filteredCodes);
    toast({ title: "Export Complete", description: "Referral codes data exported successfully" });
  };

  const handleExportPDF = () => {
    exportReferralPDF(referralCodes, filteredCodes, {
      totalRevenue, totalUses, activeCodes, conversionRate, arpu, avgRevenuePerCode,
    });
    toast({ title: "Comprehensive Report Generated", description: "Full analytics report with insights downloaded successfully" });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="codes" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Referral Management</h1>
            <p className="text-muted-foreground">Track codes, referrers, and performance</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileDown className="h-4 w-4 mr-2" />Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background z-50">
                <DropdownMenuItem onClick={handleExportCSV}>Export CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>Export PDF (Branded)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <CreateReferralCodeDialog onCodeCreated={loadReferralCodes} />
          </div>
        </div>

        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="codes">Referral Codes</TabsTrigger>
          <TabsTrigger value="referrers">Referrer Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="space-y-6">
          <AlertsWidget />

          <ReferralStatsCards
            referralCodes={referralCodes}
            totalRevenue={totalRevenue}
            totalUses={totalUses}
            activeCodes={activeCodes}
            avgRevenuePerCode={avgRevenuePerCode}
            conversionRate={conversionRate}
            arpu={arpu}
            onSortChange={setSortBy}
            onStatusFilterChange={setStatusFilter}
            onSearchChange={setSearchQuery}
          />

          {/* Analytics Charts */}
          <div className="grid gap-4 md:grid-cols-3">
            <ReferralRevenueChart referralCodes={referralCodes} />
            <ReferralUsageChart />
            <ConversionFunnelWidget
              totalCodes={referralCodes.length}
              activeCodes={activeCodes}
              totalUses={totalUses}
              paidConversions={paidConversions}
              totalRevenue={totalRevenue}
            />
          </div>

          <ReferralLeaderboard referralCodes={referralCodes} />

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input placeholder="Search by code or label..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Codes</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Referral Codes ({filteredCodes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ReferralCodesTable
                codes={filteredCodes}
                onViewDetails={viewDetails}
                onDeleteCode={deleteCode}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrers">
          <ReferrerDashboard />
        </TabsContent>
      </Tabs>

      <ReferralDetailSheet
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        selectedCode={selectedCode}
        subscriptions={subscriptions}
      />
    </div>
  );
};

export default AdminReferralCodes;
