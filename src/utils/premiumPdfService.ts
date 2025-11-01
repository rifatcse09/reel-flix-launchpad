import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Premium PDF Generation Service for ReelFlix
 * Creates professional, high-quality PDF reports with consistent branding
 */

export interface PDFConfig {
  title: string;
  subtitle?: string;
  author?: string;
  dateRange?: string;
  reportType?: string;
}

export class PremiumPDFService {
  private pdf: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private currentY: number;
  private readonly primaryColor = [255, 20, 147]; // ReelFlix Pink
  private readonly secondaryColor = [147, 51, 234]; // Purple accent
  private readonly darkGray = [55, 65, 81];
  private readonly lightGray = [243, 244, 246];
  private readonly textDark = [17, 24, 39];
  private readonly textLight = [107, 114, 128];
  private readonly margin = 25;
  private readonly contentWidth: number;

  constructor() {
    this.pdf = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.currentY = this.margin;
  }

  /**
   * Creates a premium cover page with professional branding
   */
  createCoverPage(config: PDFConfig) {
    // Gradient background effect using rectangles
    const gradientSteps = 50;
    const stepHeight = this.pageHeight / gradientSteps;
    
    for (let i = 0; i < gradientSteps; i++) {
      const ratio = i / gradientSteps;
      const r = Math.round(255 * (1 - ratio) + 147 * ratio);
      const g = Math.round(20 * (1 - ratio) + 51 * ratio);
      const b = Math.round(147 * (1 - ratio) + 234 * ratio);
      
      this.pdf.setFillColor(r, g, b);
      this.pdf.rect(0, i * stepHeight, this.pageWidth, stepHeight, 'F');
    }

    // Add subtle pattern overlay
    this.pdf.setDrawColor(255, 255, 255);
    this.pdf.setLineWidth(0.1);
    for (let i = 0; i < 20; i++) {
      const y = (this.pageHeight / 20) * i;
      this.pdf.line(0, y, this.pageWidth, y);
    }

    // Logo with ReelFlix text
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.roundedRect(this.pageWidth / 2 - 35, 40, 70, 40, 5, 5, 'F');
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(255, 20, 147);
    this.pdf.text('ReelFlix', this.pageWidth / 2, 67, { align: 'center', charSpace: 0 });

    // Main title
    this.pdf.setFontSize(36);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text(config.title, this.pageWidth / 2, 120, { align: 'center' });

    // Subtitle
    if (config.subtitle) {
      this.pdf.setFontSize(16);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(255, 255, 255);
      this.pdf.text(config.subtitle, this.pageWidth / 2, 135, { align: 'center' });
    }

    // Report type badge
    if (config.reportType) {
      const badgeWidth = 80;
      const badgeX = (this.pageWidth - badgeWidth) / 2;
      this.pdf.setFillColor(255, 255, 255);
      this.pdf.roundedRect(badgeX, 150, badgeWidth, 12, 3, 3, 'F');
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(...this.primaryColor as [number, number, number]);
      this.pdf.text(config.reportType.toUpperCase(), this.pageWidth / 2, 157.5, { align: 'center' });
    }

    // Date and metadata section
    const metadataY = this.pageHeight - 80;
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.roundedRect(this.margin, metadataY, this.contentWidth, 50, 5, 5, 'F');

    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(255, 255, 255);
    
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    this.pdf.text('Generated:', this.margin + 10, metadataY + 15);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(currentDate, this.margin + 10, metadataY + 22);
    
    if (config.dateRange) {
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text('Report Period:', this.margin + 10, metadataY + 32);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(config.dateRange, this.margin + 10, metadataY + 39);
    }

    // Footer
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text('ReelFlix Premium Analytics', this.pageWidth / 2, this.pageHeight - 15, { align: 'center' });
    this.pdf.text('Confidential & Proprietary', this.pageWidth / 2, this.pageHeight - 10, { align: 'center' });

    return this;
  }

  /**
   * Adds a new content page with consistent header
   */
  addContentPage(title?: string) {
    this.pdf.addPage();
    this.currentY = this.margin;

    // Header bar
    this.pdf.setFillColor(...this.primaryColor as [number, number, number]);
    this.pdf.rect(0, 0, this.pageWidth, 15, 'F');
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text('REELFLIX', this.margin, 10);
    
    const date = new Date().toLocaleDateString();
    this.pdf.text(date, this.pageWidth - this.margin, 10, { align: 'right' });

    this.currentY = 25;

    if (title) {
      this.addSectionTitle(title);
    }

    return this;
  }

  /**
   * Adds a premium section title with decorative elements
   */
  addSectionTitle(title: string, subtitle?: string) {
    // Decorative line above title
    this.pdf.setDrawColor(...this.primaryColor as [number, number, number]);
    this.pdf.setLineWidth(1);
    this.pdf.line(this.margin, this.currentY, this.margin + 30, this.currentY);
    
    this.currentY += 8;

    // Title
    this.pdf.setFontSize(18);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(...this.textDark as [number, number, number]);
    this.pdf.text(title, this.margin, this.currentY);
    
    this.currentY += 8;

    // Subtitle if provided
    if (subtitle) {
      this.pdf.setFontSize(11);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(...this.textLight as [number, number, number]);
      this.pdf.text(subtitle, this.margin, this.currentY);
      this.currentY += 6;
    }

    this.currentY += 5;
    return this;
  }

  /**
   * Creates KPI cards in a grid layout
   */
  addKPICards(kpis: Array<{
    label: string;
    value: string;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon?: string;
  }>) {
    const cardWidth = (this.contentWidth - 10) / 2; // 2 columns with gap
    const cardHeight = 35;
    const gap = 10;

    kpis.forEach((kpi, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = this.margin + (col * (cardWidth + gap));
      const y = this.currentY + (row * (cardHeight + gap));

      // Card background with subtle shadow
      this.pdf.setFillColor(255, 255, 255);
      this.pdf.roundedRect(x + 1, y + 1, cardWidth, cardHeight, 3, 3, 'F');
      this.pdf.setFillColor(...this.lightGray as [number, number, number]);
      this.pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');

      // Border accent
      this.pdf.setDrawColor(...this.primaryColor as [number, number, number]);
      this.pdf.setLineWidth(0.5);
      this.pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'S');

      // Label
      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(...this.textLight as [number, number, number]);
      this.pdf.text(kpi.label.toUpperCase(), x + 8, y + 10);

      // Value
      this.pdf.setFontSize(20);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(...this.textDark as [number, number, number]);
      this.pdf.text(kpi.value, x + 8, y + 23);

      // Change indicator
      if (kpi.change) {
        const changeColor = kpi.changeType === 'positive' 
          ? [34, 197, 94] 
          : kpi.changeType === 'negative'
          ? [239, 68, 68]
          : this.textLight;
        
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(...changeColor as [number, number, number]);
        this.pdf.text(kpi.change, x + 8, y + 30);
      }
    });

    this.currentY += Math.ceil(kpis.length / 2) * (cardHeight + gap) + 10;
    return this;
  }

  /**
   * Adds a premium styled table
   */
  addPremiumTable(config: {
    head: string[];
    body: (string | number)[][];
    title?: string;
    columnStyles?: any;
    summary?: { label: string; value: string }[];
  }) {
    if (config.title) {
      this.pdf.setFontSize(14);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(...this.textDark as [number, number, number]);
      this.pdf.text(config.title, this.margin, this.currentY);
      this.currentY += 8;
    }

    const tableConfig: any = {
      startY: this.currentY,
      head: [config.head],
      body: config.body,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 6,
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [...this.primaryColor] as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
        cellPadding: 8,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: config.columnStyles || {},
      didDrawPage: (data: any) => {
        // Add table shadow effect
        this.pdf.setDrawColor(200, 200, 200);
        this.pdf.setLineWidth(0.1);
      },
    };

    autoTable(this.pdf, tableConfig);
    this.currentY = (this.pdf as any).lastAutoTable.finalY + 10;

    // Add summary row if provided
    if (config.summary) {
      this.pdf.setFillColor(...this.lightGray as [number, number, number]);
      this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 15, 2, 2, 'F');
      
      let summaryX = this.margin + 10;
      config.summary.forEach((item, index) => {
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(...this.textLight as [number, number, number]);
        this.pdf.text(item.label, summaryX, this.currentY + 7);
        
        this.pdf.setFontSize(11);
        this.pdf.setTextColor(...this.textDark as [number, number, number]);
        this.pdf.text(item.value, summaryX, this.currentY + 12);
        
        summaryX += this.contentWidth / config.summary.length;
      });
      
      this.currentY += 20;
    }

    return this;
  }

  /**
   * Adds a chart image with professional framing
   */
  async addChart(chartElement: HTMLElement, title: string, subtitle?: string) {
    const html2canvas = (await import('html2canvas')).default;
    
    // Check if we need a new page
    if (this.currentY + 100 > this.pageHeight - 30) {
      this.addContentPage();
    }

    // Title
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(...this.textDark as [number, number, number]);
    this.pdf.text(title, this.margin, this.currentY);
    this.currentY += 6;

    if (subtitle) {
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(...this.textLight as [number, number, number]);
      this.pdf.text(subtitle, this.margin, this.currentY);
      this.currentY += 6;
    }

    this.currentY += 5;

    // Chart frame background
    const chartHeight = 85;
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, chartHeight, 3, 3, 'F');
    
    // Chart border
    this.pdf.setDrawColor(...this.lightGray as [number, number, number]);
    this.pdf.setLineWidth(0.5);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, chartHeight, 3, 3, 'S');

    // Capture and add chart
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');
    this.pdf.addImage(
      imgData,
      'PNG',
      this.margin + 2,
      this.currentY + 2,
      this.contentWidth - 4,
      chartHeight - 4
    );

    this.currentY += chartHeight + 15;
    return this;
  }

  /**
   * Adds an executive summary section
   */
  addExecutiveSummary(summary: {
    highlights: string[];
    insights: string[];
    recommendations?: string[];
  }) {
    this.addSectionTitle('Executive Summary', 'Key insights and strategic recommendations');

    // Highlights box
    if (summary.highlights.length > 0) {
      this.pdf.setFillColor(240, 253, 244); // Light green
      this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 10 + (summary.highlights.length * 8), 3, 3, 'F');
      this.pdf.setDrawColor(34, 197, 94); // Green border
      this.pdf.setLineWidth(0.5);
      this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 10 + (summary.highlights.length * 8), 3, 3, 'S');

      this.pdf.setFontSize(11);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(22, 163, 74);
      this.pdf.text('KEY HIGHLIGHTS', this.margin + 5, this.currentY + 7);

      this.currentY += 12;
      summary.highlights.forEach((highlight, index) => {
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(...this.textDark as [number, number, number]);
        this.pdf.text(`• ${highlight}`, this.margin + 8, this.currentY);
        this.currentY += 7;
      });
      this.currentY += 8;
    }

    // Insights section
    if (summary.insights.length > 0) {
      this.pdf.setFontSize(12);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(...this.textDark as [number, number, number]);
      this.pdf.text('Strategic Insights', this.margin, this.currentY);
      this.currentY += 8;

      summary.insights.forEach((insight, index) => {
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(...this.textDark as [number, number, number]);
        
        const lines = this.pdf.splitTextToSize(`${index + 1}. ${insight}`, this.contentWidth - 10);
        lines.forEach((line: string) => {
          this.pdf.text(line, this.margin + 5, this.currentY);
          this.currentY += 6;
        });
        this.currentY += 3;
      });
    }

    // Recommendations
    if (summary.recommendations && summary.recommendations.length > 0) {
      this.currentY += 5;
      this.pdf.setFillColor(254, 243, 199); // Light amber
      this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 10 + (summary.recommendations.length * 8), 3, 3, 'F');
      this.pdf.setDrawColor(245, 158, 11); // Amber border
      this.pdf.setLineWidth(0.5);
      this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 10 + (summary.recommendations.length * 8), 3, 3, 'S');

      this.pdf.setFontSize(11);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(217, 119, 6);
      this.pdf.text('RECOMMENDATIONS', this.margin + 5, this.currentY + 7);

      this.currentY += 12;
      summary.recommendations.forEach((rec) => {
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(...this.textDark as [number, number, number]);
        this.pdf.text(`→ ${rec}`, this.margin + 8, this.currentY, { charSpace: 0 });
        this.currentY += 7;
      });
      this.currentY += 8;
    }

    return this;
  }

  /**
   * Adds professional footer to all pages
   */
  addFooters(documentTitle: string) {
    const pageCount = this.pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i);
      
      // Skip footer on cover page
      if (i === 1) continue;

      // Footer line
      this.pdf.setDrawColor(...this.lightGray as [number, number, number]);
      this.pdf.setLineWidth(0.5);
      this.pdf.line(this.margin, this.pageHeight - 20, this.pageWidth - this.margin, this.pageHeight - 20);

      // Footer text
      this.pdf.setFontSize(8);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(...this.textLight as [number, number, number]);
      this.pdf.text(documentTitle, this.margin, this.pageHeight - 13);
      this.pdf.text(`Page ${i - 1} of ${pageCount - 1}`, this.pageWidth - this.margin, this.pageHeight - 13, { align: 'right' });
      
      this.pdf.setFontSize(7);
      this.pdf.text('ReelFlix © 2024 - Confidential', this.pageWidth / 2, this.pageHeight - 13, { align: 'center' });
    }

    return this;
  }

  /**
   * Saves the PDF with proper filename
   */
  save(filename: string) {
    const timestamp = new Date().toISOString().split('T')[0];
    this.pdf.save(`${filename}-${timestamp}.pdf`);
  }

  /**
   * Gets the jsPDF instance for custom operations
   */
  getPDF() {
    return this.pdf;
  }

  /**
   * Gets current Y position
   */
  getCurrentY() {
    return this.currentY;
  }

  /**
   * Sets current Y position
   */
  setCurrentY(y: number) {
    this.currentY = y;
    return this;
  }

  /**
   * Checks if we need a page break
   */
  checkPageBreak(requiredSpace: number = 50) {
    if (this.currentY + requiredSpace > this.pageHeight - 30) {
      this.addContentPage();
    }
    return this;
  }
}

export default PremiumPDFService;