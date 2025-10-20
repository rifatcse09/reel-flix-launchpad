import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, MoreVertical, Eye, XCircle, DollarSign, Trash2, Download, FileText, FileJson } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionDetailsDrawer } from "@/components/admin/SubscriptionDetailsDrawer";
import { SubscriptionsChart } from "@/components/admin/SubscriptionsChart";

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  ends_at: string | null;
  user_email?: string;
  processor?: string;
  processor_invoice_id?: string | null;
  referral_code_id?: string | null;
}

const AdminSubscriptions = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadSubscriptions();
    }
  }, [isAdmin]);

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          profiles!subscriptions_user_id_fkey (email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const subsWithEmails: Subscription[] = (data || []).map((sub: any) => ({
        ...sub,
        user_email: sub.profiles?.email || 'No email'
      }));

      setSubscriptions(subsWithEmails);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (plan: string) => {
    const planLower = plan.toLowerCase();
    if (planLower.includes('professional') || planLower.includes('pro')) return '💼';
    if (planLower.includes('elite') || planLower.includes('premium')) return '⭐';
    if (planLower.includes('basic') || planLower.includes('starter')) return '📦';
    return '🎟️';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-gradient-to-r from-primary to-pink-600 text-white border-0 hover:shadow-[0_0_15px_rgba(255,0,128,0.5)] transition-all';
      case 'pending':
        return 'bg-warning/20 text-warning border-warning';
      case 'cancelled':
        return 'bg-destructive/20 text-destructive border-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscription?")) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription deleted successfully",
      });

      loadSubscriptions();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast({
        title: "Error",
        description: "Failed to delete subscription",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this subscription?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription cancelled successfully",
      });

      loadSubscriptions();
      setDrawerOpen(false);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    }
  };

  const handleRefund = (id: string) => {
    toast({
      title: "Refund Initiated",
      description: "Refund process would be handled here",
    });
  };

  const handleEdit = (id: string) => {
    toast({
      title: "Edit Plan",
      description: "Plan editing would be handled here",
    });
  };

  const exportToCSV = () => {
    const headers = ['User', 'Plan', 'Status', 'Amount', 'Currency', 'Created', 'Ends'];
    const csvData = filteredSubscriptions.map(sub => [
      sub.user_email,
      sub.plan,
      sub.status,
      (sub.amount_cents / 100).toFixed(2),
      sub.currency,
      new Date(sub.created_at).toLocaleDateString(),
      sub.ends_at ? new Date(sub.ends_at).toLocaleDateString() : 'N/A',
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Success",
      description: "Subscriptions exported to CSV",
    });
  };

  const exportToJSON = () => {
    const jsonData = JSON.stringify(filteredSubscriptions, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    toast({
      title: "Success",
      description: "Subscriptions exported to JSON",
    });
  };

  // Apply filters
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = 
      sub.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.plan.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesPlan = planFilter === 'all' || sub.plan.toLowerCase().includes(planFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const activeCount = subscriptions.filter(s => s.status === 'active').length;

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Subscriptions Management</h1>
          <p className="text-muted-foreground">View and manage all subscriptions</p>
          <p className="text-sm text-primary font-semibold mt-1">{activeCount} Active Subscriptions</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="cta">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-background border-border z-50">
            <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer">
              <FileText className="h-4 w-4 mr-2" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToJSON} className="cursor-pointer">
              <FileJson className="h-4 w-4 mr-2" />
              Export JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Analytics Chart */}
      <SubscriptionsChart subscriptions={subscriptions} />

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions ({filteredSubscriptions.length})</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 focus:border-primary focus:ring-primary"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {searchQuery || statusFilter !== 'all' || planFilter !== 'all'
                        ? "No subscriptions found matching your filters"
                        : "No subscriptions found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{sub.user_email}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 capitalize">
                          {getPlanIcon(sub.plan)} {sub.plan}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(sub.status)}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {sub.currency} {(sub.amount_cents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {sub.ends_at ? new Date(sub.ends_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border-border z-50">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSubscription(sub);
                                setDrawerOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {sub.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => handleCancel(sub.id)}
                                className="cursor-pointer"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Plan
                              </DropdownMenuItem>
                            )}
                            {sub.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => handleRefund(sub.id)}
                                className="cursor-pointer"
                              >
                                <DollarSign className="h-4 w-4 mr-2" />
                                Refund
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(sub.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredSubscriptions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {searchQuery || statusFilter !== 'all' || planFilter !== 'all'
                  ? "No subscriptions found matching your filters"
                  : "No subscriptions found"}
              </div>
            ) : (
              filteredSubscriptions.map((sub) => (
                <Card key={sub.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{sub.user_email}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        {getPlanIcon(sub.plan)} {sub.plan}
                      </p>
                    </div>
                    <Badge variant="outline" className={getStatusColor(sub.status)}>
                      {sub.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-medium">{sub.currency} {(sub.amount_cents / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p>{new Date(sub.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedSubscription(sub);
                      setDrawerOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Details Drawer */}
      <SubscriptionDetailsDrawer
        subscription={selectedSubscription}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCancel={handleCancel}
        onRefund={handleRefund}
        onEdit={handleEdit}
      />
    </div>
  );
};

export default AdminSubscriptions;
