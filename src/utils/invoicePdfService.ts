import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoicePdfData {
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
  status: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  discount: number;
  currency: string;
}

export function generateInvoicePdf(data: InvoicePdfData): jsPDF {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ── Header bar ────────────────────────────────────────
  pdf.setFillColor(255, 20, 147);
  pdf.rect(0, 0, pageWidth, 40, "F");

  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text("ReelFlix", margin, 25);

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text("INVOICE", pageWidth - margin, 18, { align: "right" });
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.invoiceNumber, pageWidth - margin, 30, { align: "right" });

  y = 55;

  // ── Status badge ──────────────────────────────────────
  const statusColors: Record<string, [number, number, number]> = {
    paid: [34, 197, 94],
    unpaid: [234, 179, 8],
    draft: [107, 114, 128],
    void: [239, 68, 68],
  };
  const statusColor = statusColors[data.status] || [107, 114, 128];
  const statusLabel = data.status.toUpperCase();
  const badgeWidth = pdf.getTextWidth(statusLabel) + 12;

  pdf.setFillColor(...statusColor);
  pdf.roundedRect(pageWidth - margin - badgeWidth, y - 5, badgeWidth, 10, 2, 2, "F");
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text(statusLabel, pageWidth - margin - badgeWidth / 2, y + 1, { align: "center" });

  // ── Invoice details ───────────────────────────────────
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(107, 114, 128);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  pdf.text("Issue Date:", margin, y);
  pdf.setTextColor(17, 24, 39);
  pdf.setFont("helvetica", "bold");
  pdf.text(formatDate(data.issuedAt), margin + 30, y);

  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(107, 114, 128);
  pdf.text("Due Date:", margin, y);
  pdf.setTextColor(17, 24, 39);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.dueAt ? formatDate(data.dueAt) : "On receipt", margin + 30, y);

  if (data.paidAt) {
    y += 7;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(107, 114, 128);
    pdf.text("Paid Date:", margin, y);
    pdf.setTextColor(34, 197, 94);
    pdf.setFont("helvetica", "bold");
    pdf.text(formatDate(data.paidAt), margin + 30, y);
  }

  y += 15;

  // ── Bill To ───────────────────────────────────────────
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, y, contentWidth, 30, 3, 3, "F");
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y, contentWidth, 30, 3, 3, "S");

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(107, 114, 128);
  pdf.text("BILL TO", margin + 8, y + 10);

  pdf.setFontSize(12);
  pdf.setTextColor(17, 24, 39);
  pdf.text(data.customerName, margin + 8, y + 18);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(107, 114, 128);
  pdf.text(data.customerEmail, margin + 8, y + 25);

  y += 40;

  // ── Line items table ──────────────────────────────────
  const subtotal = data.amount;
  const total = subtotal - data.discount;

  const tableBody: (string | number)[][] = [
    [data.planName, "1", `$${subtotal.toFixed(2)}`, `$${subtotal.toFixed(2)}`],
  ];

  if (data.discount > 0) {
    tableBody.push(["Referral Discount", "", "", `-$${data.discount.toFixed(2)}`]);
  }

  autoTable(pdf, {
    startY: y,
    head: [["Description", "Qty", "Unit Price", "Amount"]],
    body: tableBody,
    theme: "plain",
    styles: {
      fontSize: 10,
      cellPadding: 8,
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [255, 20, 147],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 90 },
      3: { halign: "right" as const },
    },
  });

  y = (pdf as any).lastAutoTable.finalY + 10;

  // ── Total ─────────────────────────────────────────────
  pdf.setFillColor(17, 24, 39);
  pdf.roundedRect(pageWidth - margin - 80, y, 80, 20, 3, 3, "F");

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(255, 255, 255);
  pdf.text("TOTAL", pageWidth - margin - 72, y + 9);

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text(`$${total.toFixed(2)} ${data.currency}`, pageWidth - margin - 5, y + 14, {
    align: "right",
  });

  y += 35;

  // ── Payment instructions ──────────────────────────────
  if (data.status !== "paid") {
    pdf.setFillColor(254, 249, 195);
    pdf.roundedRect(margin, y, contentWidth, 25, 3, 3, "F");
    pdf.setDrawColor(234, 179, 8);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, y, contentWidth, 25, 3, 3, "S");

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(161, 98, 7);
    pdf.text("PAYMENT INSTRUCTIONS", margin + 8, y + 10);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(
      "Pay via cryptocurrency through our secure checkout. Visit your ReelFlix dashboard to complete payment.",
      margin + 8,
      y + 18
    );

    y += 30;
  }

  // ── Footer ────────────────────────────────────────────
  const footerY = pdf.internal.pageSize.getHeight() - 25;
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(margin, footerY, pageWidth - margin, footerY);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(107, 114, 128);
  pdf.text("ReelFlix — Premium IPTV Streaming", margin, footerY + 8);
  pdf.text(
    `Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    pageWidth - margin,
    footerY + 8,
    { align: "right" }
  );
  pdf.text("Thank you for choosing ReelFlix!", pageWidth / 2, footerY + 14, {
    align: "center",
  });

  return pdf;
}
