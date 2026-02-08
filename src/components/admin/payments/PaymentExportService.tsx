import { PremiumPDFService } from "@/utils/premiumPdfService";
import { Transaction } from "./PaymentTransactionsTable";
import { DateRange } from "react-day-picker";

interface PaymentStats {
  totalRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
}

export const exportTransactionsToCSV = (transactions: Transaction[]) => {
  const headers = ['Date', 'User', 'Plan', 'Amount', 'Currency', 'Status', 'Payment Method', 'Processor', 'Invoice ID'];
  const csvData = transactions.map(t => [
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

  const csv = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
  downloadBlob(csv, 'text/csv', `transactions-${todayISO()}.csv`);
};

export const exportTransactionsToJSON = (transactions: Transaction[]) => {
  const jsonData = JSON.stringify(transactions, null, 2);
  downloadBlob(jsonData, 'application/json', `transactions-${todayISO()}.json`);
};

export const exportTransactionsToPDF = (
  transactions: Transaction[],
  stats: PaymentStats,
  customDateRange?: DateRange
) => {
  const pdfService = new PremiumPDFService();

  pdfService.createCoverPage({
    title: 'Payment & Revenue Report',
    subtitle: 'Comprehensive Transaction Analysis',
    reportType: 'Financial Report',
    dateRange: customDateRange?.from && customDateRange?.to
      ? `${customDateRange.from.toLocaleDateString()} - ${customDateRange.to.toLocaleDateString()}`
      : 'All Time',
  });

  pdfService.addContentPage();

  const avgTransactionValue = stats.totalRevenue / transactions.length || 0;
  const successRate = (stats.successfulPayments / transactions.length) * 100 || 0;

  pdfService.addExecutiveSummary({
    highlights: [
      `Total Revenue: $${stats.totalRevenue.toFixed(2)} from ${transactions.length} transactions`,
      `Payment Success Rate: ${successRate.toFixed(1)}% (${stats.successfulPayments} successful)`,
      `Average Transaction Value: $${avgTransactionValue.toFixed(2)}`,
      `Processing Volume: ${stats.successfulPayments} active subscriptions`,
    ],
    insights: [
      `The platform has processed ${transactions.length} total transactions with a ${successRate > 95 ? 'excellent' : successRate > 85 ? 'strong' : 'moderate'} success rate of ${successRate.toFixed(1)}%.`,
      `Failed transactions (${stats.failedPayments}) represent ${((stats.failedPayments / transactions.length) * 100).toFixed(1)}% of total volume${stats.failedPayments > 10 ? ', requiring attention' : ''}.`,
      `Primary payment processor distribution shows balanced load across payment gateways.`,
    ],
    recommendations: [
      successRate < 90 ? 'Investigate and reduce payment failure rate' : 'Maintain current payment success metrics',
      stats.failedPayments > 10 ? 'Review failed transaction patterns and implement retry logic' : 'Continue monitoring payment reliability',
      'Consider implementing automated reconciliation for payment discrepancies',
    ],
  });

  pdfService.addContentPage('Financial Performance Indicators');

  pdfService.addKPICards([
    { label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, changeType: 'positive' },
    { label: 'Successful Payments', value: stats.successfulPayments.toString(), change: `${successRate.toFixed(1)}% success rate`, changeType: 'positive' },
    { label: 'Failed Payments', value: stats.failedPayments.toString(), changeType: stats.failedPayments > 10 ? 'negative' : 'neutral' },
    { label: 'Pending Payments', value: stats.pendingPayments.toString(), changeType: 'neutral' },
    { label: 'Avg Transaction', value: `$${avgTransactionValue.toFixed(2)}`, changeType: 'neutral' },
    { label: 'Total Volume', value: transactions.length.toString(), changeType: 'neutral' },
  ]);

  pdfService.addPremiumTable({
    title: 'Transaction History',
    head: ['Date', 'User', 'Plan', 'Amount', 'Status', 'Processor'],
    body: transactions.slice(0, 50).map(t => [
      new Date(t.created_at).toLocaleDateString(),
      t.user_email || 'Unknown',
      t.plan,
      `${t.currency} ${(t.amount_cents / 100).toFixed(2)}`,
      t.status.toUpperCase(),
      t.processor,
    ]),
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 25 },
    },
    summary: [
      { label: 'Total Transactions', value: transactions.length.toString() },
      { label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}` },
      { label: 'Success Rate', value: `${successRate.toFixed(1)}%` },
    ],
  });

  pdfService.addContentPage('Payment Status Analysis');

  const activeRevenue = transactions.filter(t => t.status === 'active').reduce((sum, t) => sum + t.amount_cents, 0) / 100;
  const pendingRevenue = transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount_cents, 0) / 100;

  pdfService.addPremiumTable({
    title: 'Revenue Breakdown by Status',
    head: ['Status', 'Count', 'Total Revenue', 'Avg Amount'],
    body: [
      ['Active', stats.successfulPayments.toString(), `$${activeRevenue.toFixed(2)}`, `$${(activeRevenue / stats.successfulPayments || 0).toFixed(2)}`],
      ['Pending', stats.pendingPayments.toString(), `$${pendingRevenue.toFixed(2)}`, `$${(pendingRevenue / stats.pendingPayments || 0).toFixed(2)}`],
      ['Failed', stats.failedPayments.toString(), '$0.00', '$0.00'],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { halign: 'right', cellWidth: 40 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 50 },
      3: { halign: 'right', cellWidth: 40 },
    },
  });

  const processorStats = transactions.reduce((acc, t) => {
    if (!acc[t.processor]) acc[t.processor] = { count: 0, revenue: 0 };
    acc[t.processor].count++;
    if (t.status === 'active') acc[t.processor].revenue += t.amount_cents / 100;
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  pdfService.addPremiumTable({
    title: 'Payment Processor Distribution',
    head: ['Processor', 'Transactions', 'Revenue', 'Market Share'],
    body: Object.entries(processorStats).map(([processor, data]) => [
      processor.toUpperCase(),
      data.count.toString(),
      `$${data.revenue.toFixed(2)}`,
      `${((data.count / transactions.length) * 100).toFixed(1)}%`,
    ]),
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right', fontStyle: 'bold' },
      3: { halign: 'right' },
    },
  });

  pdfService.addFooters('ReelFlix Payment & Revenue Report');
  pdfService.save('reelflix-payment-report');
};

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}
