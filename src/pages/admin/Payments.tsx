import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Download, ChevronDown, FileJson, FileText, Wifi } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { TransactionDetailsDrawer } from "@/components/admin/TransactionDetailsDrawer";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { ProcessorChart } from "@/components/admin/ProcessorChart";
import { RevenueGoalWidget } from "@/components/admin/RevenueGoalWidget";
import { PaymentStatsCards } from "@/components/admin/payments/PaymentStatsCards";
import { PaymentFilters } from "@/components/admin/payments/PaymentFilters";
import { PaymentTransactionsTable, Transaction } from "@/components/admin/payments/PaymentTransactionsTable";
import { exportTransactionsToCSV, exportTransactionsToJSON, exportTransactionsToPDF } from "@/components/admin/payments/PaymentExportService";
import { usePaymentData } from "@/components/admin/payments/usePaymentData";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";

const AdminPayments = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [processorFilter, setProcessorFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const {
    transactions,
    loading,
    stats,
    animatedRevenue,
    webhookStatus,
    getTimeSinceSync,
    loadTransactions,
  } = usePaymentData(isAdmin);

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate('/dashboard/profile');
    return null;
  }

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
      const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      switch (dateRange) {
        case '7': matchesDate = daysDiff <= 7; break;
        case '30': matchesDate = daysDiff <= 30; break;
        case '90': matchesDate = daysDiff <= 90; break;
      }
    }

    return matchesSearch && matchesStatus && matchesProcessor && matchesDate;
  });

  const hasFilters = searchQuery !== '' || statusFilter !== 'all' || processorFilter !== 'all' || dateRange !== 'all';

  const handleCancelAllInvoices = async () => {
    if (!confirm('Are you sure you want to cancel ALL invoices? This action affects all accounts and cannot be undone.')) return;
    setCancelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-all-invoices', { body: {} });
      if (error) throw error;
      toast({ title: "Success", description: data.message || `Cancelled ${data.deleted} invoices` });
      await loadTransactions();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete invoices", variant: "destructive" });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleExportCSV = () => {
    exportTransactionsToCSV(filteredTransactions);
    toast({ title: "Success", description: "Transactions exported to CSV" });
  };

  const handleExportJSON = () => {
    exportTransactionsToJSON(filteredTransactions);
    toast({ title: "Success", description: "Transactions exported to JSON" });
  };

  const handleExportPDF = () => {
    exportTransactionsToPDF(filteredTransactions, stats, customDateRange);
    toast({ title: "Premium Report Generated", description: "Professional payment report has been created successfully" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
              NOWPayments Webhook: {webhookStatus === 'connected' ? '✅ Active' : '⚠️ No events (24h)'}
            </Badge>
            <p className="text-xs text-muted-foreground pl-1">Last sync: {getTimeSinceSync()} ⟳</p>
          </div>
          <Button variant="cta" size="sm" onClick={handleCancelAllInvoices} disabled={cancelLoading}>
            {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Cancel All Invoices
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="cta">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background border-border">
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON} className="cursor-pointer">
                <FileJson className="h-4 w-4 mr-2" />Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />Export PDF (Report)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <PaymentStatsCards
        stats={stats}
        animatedRevenue={animatedRevenue}
        onFilterChange={(status) => {
          setStatusFilter(status);
          setSearchQuery('');
        }}
      />

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
          <PaymentFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            processorFilter={processorFilter}
            onProcessorChange={setProcessorFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            customDateRange={customDateRange}
            onCustomDateRangeChange={setCustomDateRange}
          />
        </CardHeader>
        <CardContent>
          <PaymentTransactionsTable
            transactions={filteredTransactions}
            hasFilters={hasFilters}
            onViewTransaction={(t) => {
              setSelectedTransaction(t);
              setDrawerOpen(true);
            }}
          />
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
