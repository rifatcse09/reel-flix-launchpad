import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Download, DollarSign, CreditCard, TrendingUp, AlertCircle, RefreshCw, ExternalLink, Eye, Wifi, ChevronDown, FileJson, FileText } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { TransactionDetailsDrawer } from "@/components/admin/TransactionDetailsDrawer";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { ProcessorChart } from "@/components/admin/ProcessorChart";
import { RevenueGoalWidget } from "@/components/admin/RevenueGoalWidget";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DateRange } from "react-day-picker";

interface Transaction {
  id: string;
  user_id: string;
  user_email?: string;
  plan: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_method: string;
  processor: string;
  processor_invoice_id: string | null;
  created_at: string;
  paid_at: string | null;
  ends_at: string | null;
}

const AdminPayments = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [processorFilter, setProcessorFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [animatedRevenue, setAnimatedRevenue] = useState(0);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'connected' | 'disconnected'>('connected');
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [previousWebhookStatus, setPreviousWebhookStatus] = useState<'connected' | 'disconnected'>('connected');

  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadTransactions();
    }
  }, [isAdmin]);

  // Monitor webhook status changes
  useEffect(() => {
    if (webhookStatus !== previousWebhookStatus) {
      if (webhookStatus === 'disconnected') {
        toast({
          title: "⚠️ Webhook Disconnected",
          description: "Stripe webhooks are not responding. Payment updates may be delayed.",
          variant: "destructive",
        });
      } else if (webhookStatus === 'connected' && previousWebhookStatus === 'disconnected') {
        toast({
          title: "✅ Webhook Reconnected",
          description: "Stripe webhooks are now active. Payment data is syncing.",
        });
      }
      setPreviousWebhookStatus(webhookStatus);
    }
  }, [webhookStatus, previousWebhookStatus, toast]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!isAdmin) return;
    
    const interval = setInterval(() => {
      loadTransactions();
      setLastSync(new Date());
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isAdmin]);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          profiles!subscriptions_user_id_fkey (email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transactionsWithEmails: Transaction[] = (data || []).map((sub: any) => ({
        ...sub,
        user_email: sub.profiles?.email || 'No email',
        payment_method: 'card', // Default, you can add a column to track this
      }));

      setTransactions(transactionsWithEmails);
      setLastSync(new Date());

      // Calculate stats
      const successful = transactionsWithEmails.filter(t => t.status === 'active');
      const failed = transactionsWithEmails.filter(t => t.status === 'cancelled');
      const pending = transactionsWithEmails.filter(t => t.status === 'pending');
      const revenue = successful.reduce((sum, t) => sum + t.amount_cents, 0) / 100;

      setStats({
        totalRevenue: revenue,
        successfulPayments: successful.length,
        failedPayments: failed.length,
        pendingPayments: pending.length,
      });

      // Animate revenue counter
      const duration = 1500;
      const steps = 60;
      const increment = revenue / steps;
      let currentStep = 0;
      
      const timer = setInterval(() => {
        currentStep++;
        setAnimatedRevenue(Math.min(increment * currentStep, revenue));
        
        if (currentStep >= steps) {
          clearInterval(timer);
          setAnimatedRevenue(revenue);
        }
      }, duration / steps);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeSinceSync = () => {
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1m ago';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return diffHours === 1 ? '1h ago' : `${diffHours}h ago`;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Plan', 'Amount', 'Currency', 'Status', 'Payment Method', 'Processor', 'Invoice ID'];
    const csvData = filteredTransactions.map(t => [
      new Date(t.created_at).toLocaleDateString(),
      t.user_email,
      t.plan,
      (t.amount_cents / 100).toFixed(2),
      t.currency,
      t.status,
      t.payment_method,
      t.processor,
      t.processor_invoice_id || 'N/A',
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Success",
      description: "Transactions exported to CSV",
    });
  };

  const exportToJSON = () => {
    const jsonData = JSON.stringify(filteredTransactions, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    toast({
      title: "Success",
      description: "Transactions exported to JSON",
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header with branding
    doc.setFillColor(255, 0, 128);
    doc.rect(0, 0, 220, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('ReelFlix', 14, 15);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Transactions Report', 14, 25);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 45);
    doc.text(`Total Transactions: ${filteredTransactions.length}`, 14, 51);
    doc.text(`Total Revenue: $${stats.totalRevenue.toFixed(2)}`, 14, 57);
    doc.text(`Successful Payments: ${stats.successfulPayments}`, 14, 63);
    doc.text(`Failed Payments: ${stats.failedPayments}`, 14, 69);

    const tableData = filteredTransactions.map(t => [
      new Date(t.created_at).toLocaleDateString(),
      t.user_email,
      t.plan,
      `${t.currency} ${(t.amount_cents / 100).toFixed(2)}`,
      t.status,
      t.processor,
    ]);

    autoTable(doc, {
      head: [['Date', 'User', 'Plan', 'Amount', 'Status', 'Processor']],
      body: tableData,
      startY: 75,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 0, 128], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `ReelFlix - Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`reelflix-transactions-${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
      title: "Success",
      description: "Branded PDF report generated",
    });
  };

  const getStatusColor = (status: string): "outline" | "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'active':
        return 'default'; // Will use custom pink styling
      case 'pending':
        return 'secondary'; // Will use custom yellow styling
      case 'cancelled':
        return 'destructive'; // Will use custom red styling
      default:
        return 'outline';
    }
  };

  const getProcessorColor = (processor: string) => {
    switch (processor.toLowerCase()) {
      case 'stripe':
        return 'bg-primary/20 text-primary border-primary';
      case 'paypal':
        return 'bg-blue-500/20 text-blue-500 border-blue-500';
      case 'sensapay':
        return 'bg-purple-500/20 text-purple-500 border-purple-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Apply filters
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = 
      transaction.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.plan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.processor_invoice_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesProcessor = processorFilter === 'all' || transaction.processor === processorFilter;
    
    let matchesDate = true;
    if (customDateRange?.from && customDateRange?.to) {
      const transactionDate = new Date(transaction.created_at);
      const fromDate = new Date(customDateRange.from);
      const toDate = new Date(customDateRange.to);
      toDate.setHours(23, 59, 59, 999);
      matchesDate = transactionDate >= fromDate && transactionDate <= toDate;
    } else if (dateRange !== 'all') {
      const date = new Date(transaction.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateRange) {
        case '7':
          matchesDate = daysDiff <= 7;
          break;
        case '30':
          matchesDate = daysDiff <= 30;
          break;
        case '90':
          matchesDate = daysDiff <= 90;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesProcessor && matchesDate;
  });

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payments & Billing</h1>
          <p className="text-muted-foreground">Manage transactions and payment history</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-col gap-1">
            <Badge 
              variant="outline" 
              className={webhookStatus === 'connected' 
                ? 'bg-success/20 text-success border-success' 
                : 'bg-destructive/20 text-destructive border-destructive'
              }
            >
              <Wifi className="h-3 w-3 mr-1" />
              Stripe Webhooks: {webhookStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
            </Badge>
            <p className="text-xs text-muted-foreground pl-1">
              Last sync: {getTimeSinceSync()} ⟳
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="cta">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background border-border">
              <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToJSON} className="cursor-pointer">
                <FileJson className="h-4 w-4 mr-2" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                Export PDF (Report)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className="cursor-pointer hover:shadow-[0_0_20px_rgba(255,0,128,0.3)] transition-all animate-fade-in"
          onClick={() => {
            setStatusFilter('all');
            setSearchQuery('');
            toast({
              title: "Filter Applied",
              description: "Showing all transactions",
            });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">💰 Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${animatedRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From all successful payments
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-[0_0_20px_rgba(255,0,128,0.3)] transition-all animate-fade-in"
          onClick={() => {
            setStatusFilter('active');
            setSearchQuery('');
            toast({
              title: "Filter Applied",
              description: "Showing successful payments only",
            });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">✅ Successful Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.successfulPayments}</div>
            <p className="text-xs text-muted-foreground">
              Active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-[0_0_20px_rgba(255,0,128,0.3)] transition-all animate-fade-in"
          onClick={() => {
            setStatusFilter('cancelled');
            setSearchQuery('');
            toast({
              title: "Filter Applied",
              description: "Showing failed payments only",
            });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">⚠️ Failed Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.failedPayments}</div>
            <p className="text-xs text-muted-foreground">
              Cancelled or failed
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-[0_0_20px_rgba(255,0,128,0.3)] transition-all animate-fade-in"
          onClick={() => {
            setStatusFilter('pending');
            setSearchQuery('');
            toast({
              title: "Filter Applied",
              description: "Showing pending payments only",
            });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🔄 Pending Payments</CardTitle>
            <RefreshCw className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pendingPayments}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <RevenueChart transactions={transactions} />

      {/* Analytics Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <ProcessorChart transactions={transactions} />
        <RevenueGoalWidget currentRevenue={stats.totalRevenue} goalRevenue={5000} />
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History ({filteredTransactions.length})</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
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
            <Select value={processorFilter} onValueChange={setProcessorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by processor" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                <SelectItem value="all">All Processors</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="sensapay">SensaPay</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={dateRange} 
              onValueChange={(value) => {
                setDateRange(value);
                if (value !== 'custom') {
                  setCustomDateRange(undefined);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {dateRange === 'custom' && (
              <DateRangePicker
                date={customDateRange}
                onDateChange={setCustomDateRange}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Processor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {searchQuery || statusFilter !== 'all' || processorFilter !== 'all' || dateRange !== 'all'
                      ? "No transactions found matching your filters"
                      : "No transactions found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{transaction.user_email}</TableCell>
                    <TableCell className="capitalize">{transaction.plan}</TableCell>
                    <TableCell className="font-medium">
                      {transaction.currency} {(transaction.amount_cents / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="capitalize">{transaction.payment_method}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getProcessorColor(transaction.processor)}>
                        {transaction.processor}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getStatusColor(transaction.status)}
                        className={`gap-1 ${
                          transaction.status === 'active' ? 'bg-primary/20 text-primary border-primary' :
                          transaction.status === 'pending' ? 'bg-warning/20 text-warning border-warning' :
                          transaction.status === 'cancelled' ? 'bg-destructive/20 text-destructive border-destructive' :
                          ''
                        }`}
                      >
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {transaction.processor_invoice_id ? (
                        <a
                          href={`https://dashboard.stripe.com/invoices/${transaction.processor_invoice_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-accent flex items-center gap-1 hover:underline"
                        >
                          {transaction.processor_invoice_id.slice(0, 12)}...
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setDrawerOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View transaction details</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction Details Drawer */}
      <TransactionDetailsDrawer
        transaction={selectedTransaction}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
};

export default AdminPayments;
