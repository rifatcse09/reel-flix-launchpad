import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Download, DollarSign, Users, TrendingUp, Ticket, Trash2, FileDown, Percent, Eye } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ReferralRevenueChart } from "@/components/admin/ReferralRevenueChart";
import { ReferralUsageChart } from "@/components/admin/ReferralUsageChart";
import { ReferralLeaderboard } from "@/components/admin/ReferralLeaderboard";
import { ConversionFunnelWidget } from "@/components/admin/ConversionFunnelWidget";
import { ReferrerDashboard } from "@/components/admin/ReferrerDashboard";
import { AlertsWidget } from "@/components/admin/AlertsWidget";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReferralCode {
  id: string;
  code: string;
  active: boolean;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  label: string | null;
  discount_amount_cents: number;
  trial_hours: number;
  discount_type: string;
  created_by: string | null;
  plan_type: string;
  whmcs_affiliate_id: number | null;
  use_count?: number;
  click_count?: number;
  revenue?: number;
  creator_name?: string;
}

const AdminReferralCodes = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'revenue' | 'uses' | 'none'>('none');
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<ReferralCode | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  
  // Form state
  const [newCode, setNewCode] = useState("");
  const [label, setLabel] = useState("");
  const [active, setActive] = useState(true);
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [discountAmount, setDiscountAmount] = useState("20");
  const [trialHours, setTrialHours] = useState("24");
  const [discountType, setDiscountType] = useState("both");
  const [planType, setPlanType] = useState("one-year");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadReferralCodes();
    }
  }, [isAdmin]);

  const loadReferralCodes = async () => {
    try {
      const { data: codes, error } = await supabase
        .from('referral_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get creator names
      const creatorIds = codes?.map(code => code.created_by).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds);

      // Get use counts for each code
      const { data: uses } = await supabase
        .from('referral_uses')
        .select('code_id');

      // Get click counts for each code
      const { data: clicks } = await supabase
        .from('referral_clicks')
        .select('code_id');

      // Get revenue for each code
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('referral_code_id, amount_cents')
        .eq('status', 'paid');

      const codesWithCounts = codes?.map(code => {
        const useCount = uses?.filter(use => use.code_id === code.id).length || 0;
        const clickCount = clicks?.filter(click => click.code_id === code.id).length || 0;
        const revenue = subscriptions
          ?.filter(sub => sub.referral_code_id === code.id)
          .reduce((sum, sub) => sum + (sub.amount_cents || 0), 0) || 0;
        
        const creator = profiles?.find(p => p.id === code.created_by);
        
        return {
          ...code,
          use_count: useCount,
          click_count: clickCount,
          revenue: revenue / 100, // Convert to dollars
          creator_name: creator?.full_name || 'System'
        };
      }) || [];

      setReferralCodes(codesWithCounts);
    } catch (error) {
      console.error('Error loading referral codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  const handleCreateCode = async () => {
    if (!newCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a code",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Automatically create WHMCS affiliate
      let affiliateId = null;
      
      toast({
        title: "Creating affiliate...",
        description: "Setting up WHMCS affiliate account",
      });

      const { data: affiliateData, error: affiliateError } = await supabase.functions.invoke(
        'create-whmcs-affiliate',
        {
          body: {
            email: label ? `${newCode.toLowerCase()}@referral.local` : session.user.email,
            firstName: label || newCode,
            lastName: 'Referral',
          },
        }
      );

      if (affiliateError) {
        console.error('Affiliate creation error:', affiliateError);
        toast({
          title: "Warning",
          description: "Could not create WHMCS affiliate. Continuing without it.",
          variant: "destructive"
        });
      } else if (affiliateData?.success) {
        affiliateId = affiliateData.affiliateId;
        toast({
          title: affiliateData.existing ? "Affiliate Found" : "Affiliate Created",
          description: `WHMCS Affiliate ID: ${affiliateId}`,
        });
      }

      // Create referral code with affiliate ID
      const codeData: any = {
        code: newCode.toUpperCase(),
        label: label || null,
        active,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt || null,
        discount_amount_cents: parseInt(discountAmount) * 100,
        trial_hours: parseInt(trialHours),
        discount_type: discountType,
        plan_type: planType,
        whmcs_affiliate_id: affiliateId,
      };

      const { error } = await supabase
        .from('referral_codes')
        .insert(codeData);

      if (error) throw error;

      toast({
        title: "Success",
        description: affiliateId 
          ? `Referral code created with WHMCS Affiliate ID: ${affiliateId}`
          : "Referral code created successfully"
      });

      // Reset form
      setNewCode("");
      setLabel("");
      setActive(true);
      setMaxUses("");
      setExpiresAt("");
      setDiscountAmount("20");
      setTrialHours("24");
      setDiscountType("both");
      setPlanType("one-year");
      setDialogOpen(false);

      // Reload codes
      await loadReferralCodes();
    } catch (error: any) {
      console.error('Error creating code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create referral code",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteCode = async (codeId: string, codeName: string) => {
    if (!confirm(`Are you sure you want to delete referral code ${codeName}? This action cannot be undone.`)) {
      return;
    }

    try {
      // First, unlink any subscriptions that reference this code
      const { error: unlinkError } = await supabase
        .from('subscriptions')
        .update({ referral_code_id: null })
        .eq('referral_code_id', codeId);

      if (unlinkError) {
        console.error('Error unlinking subscriptions:', unlinkError);
        // Continue anyway - we'll try to delete the code
      }

      // Also clean up referral_uses and referral_clicks
      await supabase
        .from('referral_uses')
        .delete()
        .eq('code_id', codeId);

      await supabase
        .from('referral_clicks')
        .delete()
        .eq('code_id', codeId);

      // Delete any alert thresholds
      await supabase
        .from('referral_alert_thresholds')
        .delete()
        .eq('code_id', codeId);

      // Now delete the referral code
      const { error } = await supabase
        .from('referral_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Referral code ${codeName} deleted successfully`
      });

      await loadReferralCodes();
    } catch (error: any) {
      console.error('Error deleting code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete referral code",
        variant: "destructive"
      });
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
      toast({
        title: "Error",
        description: "Failed to load subscriptions: " + error.message,
        variant: "destructive"
      });
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const exportToCSV = () => {
    const headers = ['Code', 'Label', 'Status', 'Uses', 'Revenue', 'Creator', 'Created', 'Expires'];
    const rows = filteredCodes.map(code => [
      code.code,
      code.label || '',
      code.active ? 'Active' : 'Inactive',
      code.use_count || 0,
      `$${code.revenue?.toFixed(2) || '0.00'}`,
      code.creator_name || 'System',
      new Date(code.created_at).toLocaleDateString(),
      code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral-codes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Referral codes data exported successfully"
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // ReelFlix Branding Header
    doc.setFillColor(236, 72, 153); // Pink
    doc.rect(0, 0, 220, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text('ReelFlix', 14, 22);
    doc.setFontSize(14);
    doc.text('Referral Analytics Report', 14, 32);
    
    // Date & Time
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);
    
    // Executive Summary Section
    doc.setFillColor(248, 250, 252); // Light gray background
    doc.rect(14, 48, 182, 45, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 20, 58);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // First row of metrics
    doc.setFont('helvetica', 'bold');
    doc.text('Total Revenue:', 20, 68);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(34, 197, 94); // Green
    doc.text(`$${totalRevenue.toFixed(2)}`, 55, 68);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Uses:', 100, 68);
    doc.setFont('helvetica', 'normal');
    doc.text(`${totalUses}`, 125, 68);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Active Codes:', 155, 68);
    doc.setFont('helvetica', 'normal');
    doc.text(`${activeCodes}/${referralCodes.length}`, 180, 68);
    
    // Second row of metrics
    doc.setFont('helvetica', 'bold');
    doc.text('Conversion Rate:', 20, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(`${conversionRate.toFixed(1)}%`, 55, 78);
    
    doc.setFont('helvetica', 'bold');
    doc.text('ARPU:', 100, 78);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(236, 72, 153); // Pink
    doc.text(`$${arpu.toFixed(2)}`, 115, 78);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Avg per Code:', 155, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${avgRevenuePerCode.toFixed(2)}`, 180, 78);
    
    // Performance Insights
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Insights:', 20, 88);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`• ${(activeCodes / referralCodes.length * 100).toFixed(0)}% of codes are currently active`, 20, 93);
    
    // Top Performers Section
    const topPerformers = [...referralCodes]
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 5);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Top 5 Performers', 14, 105);
    
    const topPerformersData = topPerformers.map((code, index) => [
      `${index + 1}`,
      code.code,
      code.label || '-',
      code.creator_name || 'System',
      (code.use_count || 0).toString(),
      `$${code.revenue?.toFixed(2) || '0.00'}`
    ]);
    
    autoTable(doc, {
      startY: 110,
      head: [['Rank', 'Code', 'Label', 'Creator', 'Uses', 'Revenue']],
      body: topPerformersData,
      theme: 'striped',
      headStyles: {
        fillColor: [236, 72, 153],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      alternateRowStyles: {
        fillColor: [252, 231, 243]
      },
      styles: {
        fontSize: 9
      }
    });
    
    // Full Codes Table
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Complete Referral Codes Directory', 14, 20);
    
    const tableData = filteredCodes.map(code => [
      code.code,
      code.label || '-',
      code.active ? '✓ Active' : '✗ Inactive',
      (code.use_count || 0).toString(),
      `$${code.revenue?.toFixed(2) || '0.00'}`,
      code.creator_name || 'System',
      new Date(code.created_at).toLocaleDateString()
    ]);
    
    autoTable(doc, {
      startY: 28,
      head: [['Code', 'Label', 'Status', 'Uses', 'Revenue', 'Creator', 'Created']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [236, 72, 153],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [252, 231, 243]
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      columnStyles: {
        0: { fontStyle: 'bold', font: 'courier' },
        4: { textColor: [34, 197, 94], fontStyle: 'bold' }
      }
    });
    
    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`ReelFlix Referral Analytics | Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
      doc.text(`Confidential`, doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`reelflix-referral-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "Comprehensive Report Generated",
      description: "Full analytics report with insights downloaded successfully"
    });
  };

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
      if (sortBy === 'revenue') {
        return (b.revenue || 0) - (a.revenue || 0);
      } else if (sortBy === 'uses') {
        return (b.use_count || 0) - (a.use_count || 0);
      }
      return 0;
    });

  const totalRevenue = referralCodes.reduce((sum, code) => sum + (code.revenue || 0), 0);
  const totalUses = referralCodes.reduce((sum, code) => sum + (code.use_count || 0), 0);
  const activeCodes = referralCodes.filter(code => code.active).length;
  const avgRevenuePerCode = referralCodes.length > 0 ? totalRevenue / referralCodes.length : 0;
  const conversionRate = referralCodes.length > 0 ? (totalUses / referralCodes.length) * 100 : 0;
  const arpu = totalUses > 0 ? totalRevenue / totalUses : 0; // Average Revenue Per Use
  const paidConversions = referralCodes.reduce((sum, code) => sum + (code.use_count || 0), 0); // Assuming uses that led to revenue

  if (!isAdmin) {
    return null;
  }

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
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background z-50">
              <DropdownMenuItem onClick={exportToCSV}>
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                Export PDF (Branded)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="cta">
              <Plus className="h-4 w-4 mr-2" />
              Create Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Referral Code</DialogTitle>
              <DialogDescription>
                Generate a new referral code with custom settings
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="uppercase"
                  />
                  <Button variant="outline" onClick={generateRandomCode}>
                    Generate
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Label (Optional)</Label>
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., Summer Promo, Partner Code"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount-type">Benefit Type</Label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Trial + Discount</SelectItem>
                      <SelectItem value="trial">Trial Only</SelectItem>
                      <SelectItem value="discount">Discount Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trial-hours">Trial Hours</Label>
                  <Input
                    id="trial-hours"
                    type="number"
                    value={trialHours}
                    onChange={(e) => setTrialHours(e.target.value)}
                    disabled={discountType === 'discount'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount-amount">Discount Amount ($)</Label>
                <Input
                  id="discount-amount"
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  disabled={discountType === 'trial'}
                  placeholder="20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-type">Applies To</Label>
                <Select value={planType} onValueChange={setPlanType}>
                  <SelectTrigger id="plan-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="one-year">One Year Subscription</SelectItem>
                    <SelectItem value="six-months">Six Months Subscription</SelectItem>
                    <SelectItem value="one-month">One Month Subscription</SelectItem>
                    <SelectItem value="all-plans">All Plans</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Which subscription plan this discount applies to
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Auto WHMCS Affiliate</p>
                    <p className="text-xs text-muted-foreground">
                      WHMCS affiliate will be created automatically
                    </p>
                  </div>
                  <Badge variant="secondary">Enabled</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-uses">Max Uses (Optional)</Label>
                  <Input
                    id="max-uses"
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Unlimited"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires">Expires At (Optional)</Label>
                  <Input
                    id="expires"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={active}
                  onCheckedChange={setActive}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="cta" onClick={handleCreateCode} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Code"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </div>
        </div>

        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="codes">Referral Codes</TabsTrigger>
          <TabsTrigger value="referrers">Referrer Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="space-y-6">
          {/* Alerts Widget */}
          <AlertsWidget />

          {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSortBy('revenue');
            setStatusFilter('all');
            setSearchQuery('');
            toast({
              title: "Sorted by Revenue",
              description: "Showing codes by highest revenue first",
            });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From all referral codes
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSortBy('uses');
            setStatusFilter('all');
            setSearchQuery('');
            toast({
              title: "Sorted by Usage",
              description: "Showing most used codes first",
            });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUses}</div>
            <p className="text-xs text-muted-foreground">
              Total redemptions
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setStatusFilter('active');
            setSortBy('none');
            setSearchQuery('');
            toast({
              title: "Filter Applied",
              description: "Showing active codes only",
            });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCodes}</div>
            <p className="text-xs text-muted-foreground">
              of {referralCodes.length} total
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSortBy('revenue');
            setStatusFilter('all');
            setSearchQuery('');
            toast({
              title: "Sorted by Revenue",
              description: "Showing top performing codes",
            });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgRevenuePerCode.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per referral code
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Avg uses per code
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-pink-500/5 to-rose-500/5 border-pink-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <DollarSign className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
              ${arpu.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg revenue per use
            </p>
          </CardContent>
        </Card>
      </div>

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

      {/* Leaderboard */}
      <ReferralLeaderboard referralCodes={referralCodes} />

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by code or label..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Benefits</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Max Uses</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCodes.map((code) => (
                <TableRow key={code.id} className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                  <TableCell className="font-mono font-bold">{code.code}</TableCell>
                  <TableCell>{code.label || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{code.creator_name}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={code.active ? 'default' : 'destructive'}>
                      {code.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      ${(code.discount_amount_cents / 100).toFixed(0)} off {code.plan_type === 'one-year' ? 'one-year' : code.plan_type === 'six-months' ? 'six-month' : code.plan_type === 'one-month' ? 'one-month' : 'any'} subscription
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {code.click_count || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>{code.use_count}</TableCell>
                  <TableCell className="font-semibold">${code.revenue?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>{code.max_uses || 'Unlimited'}</TableCell>
                  <TableCell>
                    {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>{new Date(code.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewDetails(code)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteCode(code.id, code.code)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrers">
          <ReferrerDashboard />
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Code: {selectedCode?.code}</SheetTitle>
            <SheetDescription>
              {selectedCode?.label || 'No label'}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Uses</p>
                <p className="text-2xl font-bold">{selectedCode?.use_count || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clicks</p>
                <p className="text-2xl font-bold">{selectedCode?.click_count || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ${(selectedCode?.revenue || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">
                  {selectedCode?.click_count && selectedCode.click_count > 0
                    ? ((selectedCode.use_count || 0) / selectedCode.click_count * 100).toFixed(1)
                    : '0'}%
                </p>
              </div>
              {selectedCode && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Referral Link</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const affiliateLink = `${window.location.origin}/register?ref=${selectedCode.code}`;
                        navigator.clipboard.writeText(affiliateLink);
                        toast({
                          title: "Copied!",
                          description: "Referral link copied to clipboard",
                        });
                      }}
                    >
                      Copy Referral Link
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                    {window.location.origin}/register?ref={selectedCode.code}
                  </p>
                </div>
              )}
              {selectedCode?.whmcs_affiliate_id && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">WHMCS Affiliate ID</p>
                  <p className="text-lg font-semibold mt-1">{selectedCode.whmcs_affiliate_id}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    (Commission tracked in WHMCS)
                  </p>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Paid Subscriptions ({subscriptions.length})</h3>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No paid subscriptions yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      subscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            {sub.paid_at 
                              ? new Date(sub.paid_at).toLocaleDateString()
                              : new Date(sub.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{sub.plan}</TableCell>
                          <TableCell className="text-right">
                            ${(sub.amount_cents / 100).toFixed(2)} {sub.currency}
                          </TableCell>
                          <TableCell>
                            <Badge variant={sub.status === 'paid' ? 'default' : 'secondary'}>
                              {sub.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminReferralCodes;
