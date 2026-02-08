import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReferralCode } from './ReferralCodesTable';

interface ExportStats {
  totalRevenue: number;
  totalUses: number;
  activeCodes: number;
  conversionRate: number;
  arpu: number;
  avgRevenuePerCode: number;
}

export const exportReferralCSV = (codes: ReferralCode[]) => {
  const headers = ['Code', 'Label', 'Status', 'Uses', 'Revenue', 'Creator', 'Created', 'Expires'];
  const rows = codes.map(code => [
    code.code,
    code.label || '',
    code.active ? 'Active' : 'Inactive',
    code.use_count || 0,
    `$${code.revenue?.toFixed(2) || '0.00'}`,
    code.creator_name || 'System',
    new Date(code.created_at).toLocaleDateString(),
    code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `referral-codes-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const exportReferralPDF = (
  referralCodes: ReferralCode[],
  filteredCodes: ReferralCode[],
  stats: ExportStats
) => {
  const doc = new jsPDF();

  // ReelFlix Branding Header
  doc.setFillColor(236, 72, 153);
  doc.rect(0, 0, 220, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('ReelFlix', 14, 22);
  doc.setFontSize(14);
  doc.text('Referral Analytics Report', 14, 32);

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);

  // Executive Summary
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 48, 182, 45, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 20, 58);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.setFont('helvetica', 'bold');
  doc.text('Total Revenue:', 20, 68);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(34, 197, 94);
  doc.text(`$${stats.totalRevenue.toFixed(2)}`, 55, 68);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Uses:', 100, 68);
  doc.setFont('helvetica', 'normal');
  doc.text(`${stats.totalUses}`, 125, 68);

  doc.setFont('helvetica', 'bold');
  doc.text('Active Codes:', 155, 68);
  doc.setFont('helvetica', 'normal');
  doc.text(`${stats.activeCodes}/${referralCodes.length}`, 180, 68);

  doc.setFont('helvetica', 'bold');
  doc.text('Conversion Rate:', 20, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(`${stats.conversionRate.toFixed(1)}%`, 55, 78);

  doc.setFont('helvetica', 'bold');
  doc.text('ARPU:', 100, 78);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(236, 72, 153);
  doc.text(`$${stats.arpu.toFixed(2)}`, 115, 78);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Avg per Code:', 155, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(`$${stats.avgRevenuePerCode.toFixed(2)}`, 180, 78);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Insights:', 20, 88);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`• ${((stats.activeCodes / referralCodes.length) * 100).toFixed(0)}% of codes are currently active`, 20, 93);

  // Top Performers
  const topPerformers = [...referralCodes].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 5);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Top 5 Performers', 14, 105);

  autoTable(doc, {
    startY: 110,
    head: [['Rank', 'Code', 'Label', 'Creator', 'Uses', 'Revenue']],
    body: topPerformers.map((code, index) => [
      `${index + 1}`,
      code.code,
      code.label || '-',
      code.creator_name || 'System',
      (code.use_count || 0).toString(),
      `$${code.revenue?.toFixed(2) || '0.00'}`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [236, 72, 153], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
    alternateRowStyles: { fillColor: [252, 231, 243] },
    styles: { fontSize: 9 },
  });

  // Full Codes Table
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Complete Referral Codes Directory', 14, 20);

  autoTable(doc, {
    startY: 28,
    head: [['Code', 'Label', 'Status', 'Uses', 'Revenue', 'Creator', 'Created']],
    body: filteredCodes.map(code => [
      code.code,
      code.label || '-',
      code.active ? '✓ Active' : '✗ Inactive',
      (code.use_count || 0).toString(),
      `$${code.revenue?.toFixed(2) || '0.00'}`,
      code.creator_name || 'System',
      new Date(code.created_at).toLocaleDateString(),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [236, 72, 153], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [252, 231, 243] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', font: 'courier' },
      4: { textColor: [34, 197, 94], fontStyle: 'bold' },
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`ReelFlix Referral Analytics | Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    doc.text(`Confidential`, doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 10);
  }

  doc.save(`reelflix-referral-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
};
