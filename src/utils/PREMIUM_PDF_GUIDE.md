# Premium PDF Service Guide

## Overview
The `PremiumPDFService` class provides professional, high-quality PDF generation for ReelFlix reports with consistent branding, beautiful layouts, and polished design.

## Features
✨ **Professional Cover Pages** with gradient backgrounds and branding  
📊 **KPI Cards** in responsive grid layouts  
📈 **Chart Integration** with professional framing  
📋 **Premium Tables** with alternating rows and summaries  
💡 **Executive Summaries** with highlights, insights, and recommendations  
🎨 **Consistent Branding** throughout all pages  
📑 **Automatic Headers & Footers** with page numbers  

## Basic Usage

```typescript
import { PremiumPDFService } from "@/utils/premiumPdfService";

const exportToPDF = async () => {
  // 1. Initialize the service
  const pdfService = new PremiumPDFService();

  // 2. Create cover page
  pdfService.createCoverPage({
    title: 'Your Report Title',
    subtitle: 'Descriptive subtitle',
    reportType: 'Report Type',
    dateRange: 'Date Range Here',
  });

  // 3. Add content pages
  pdfService.addContentPage('Section Title');
  
  // 4. Add your content (see methods below)
  
  // 5. Add footers and save
  pdfService.addFooters('Document Title');
  pdfService.save('filename');
};
```

## Available Methods

### `createCoverPage(config)`
Creates a stunning cover page with gradient background.

```typescript
pdfService.createCoverPage({
  title: 'Analytics Report',
  subtitle: 'Q4 2024 Performance',
  reportType: 'Quarterly Report',
  dateRange: 'Oct 1 - Dec 31, 2024',
});
```

### `addContentPage(title?)`
Adds a new content page with consistent header.

```typescript
pdfService.addContentPage('Financial Overview');
```

### `addKPICards(kpis)`
Creates beautiful KPI cards in a 2-column grid.

```typescript
pdfService.addKPICards([
  {
    label: 'Total Revenue',
    value: '$50,000',
    change: '+15.2%',
    changeType: 'positive' // 'positive' | 'negative' | 'neutral'
  },
  {
    label: 'Active Users',
    value: '1,234',
    changeType: 'neutral'
  },
]);
```

### `addPremiumTable(config)`
Creates a professional table with optional summary row.

```typescript
pdfService.addPremiumTable({
  title: 'Transaction History',
  head: ['Date', 'User', 'Amount', 'Status'],
  body: [
    ['2024-01-01', 'user@email.com', '$99', 'Active'],
    ['2024-01-02', 'user2@email.com', '$149', 'Pending'],
  ],
  columnStyles: {
    0: { cellWidth: 30 },
    1: { cellWidth: 60 },
    2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    3: { cellWidth: 30, halign: 'center' },
  },
  summary: [
    { label: 'Total', value: '$248' },
    { label: 'Count', value: '2' },
  ]
});
```

### `addChart(element, title, subtitle?)`
Captures and adds a chart with professional framing.

```typescript
const chartRef = useRef<HTMLDivElement>(null);

// In your JSX:
<div ref={chartRef}>
  <YourChartComponent />
</div>

// In PDF export:
await pdfService.addChart(
  chartRef.current!,
  'Revenue Growth',
  'Monthly revenue trends over the past year'
);
```

### `addExecutiveSummary(summary)`
Adds a comprehensive executive summary section.

```typescript
pdfService.addExecutiveSummary({
  highlights: [
    'Revenue increased by 25% YoY',
    '1,500 new customers acquired',
    'Customer retention rate: 92%',
  ],
  insights: [
    'Strong growth momentum driven by premium tier adoption',
    'Mobile platform shows highest engagement rates',
  ],
  recommendations: [
    'Expand marketing to enterprise segment',
    'Implement loyalty rewards program',
  ]
});
```

### `addSectionTitle(title, subtitle?)`
Adds a styled section title with decorative elements.

```typescript
pdfService.addSectionTitle(
  'Revenue Analysis',
  'Detailed breakdown of revenue streams'
);
```

### Utility Methods

```typescript
// Check if page break is needed
pdfService.checkPageBreak(50); // 50mm required space

// Get/Set current Y position
const currentY = pdfService.getCurrentY();
pdfService.setCurrentY(100);

// Access raw jsPDF instance if needed
const pdf = pdfService.getPDF();
```

## Complete Example

```typescript
const exportToPDF = async () => {
  const pdfService = new PremiumPDFService();

  // Cover
  pdfService.createCoverPage({
    title: 'Q4 2024 Analytics',
    subtitle: 'Comprehensive Performance Review',
    reportType: 'Quarterly Report',
    dateRange: 'October - December 2024',
  });

  // Executive Summary
  pdfService.addContentPage();
  pdfService.addExecutiveSummary({
    highlights: [
      'Revenue: $150,000 (+30% vs Q3)',
      'New users: 2,500',
      'Retention: 95%',
    ],
    insights: [
      'Strong holiday season performance',
      'Premium tier driving revenue growth',
    ],
    recommendations: [
      'Expand premium features',
      'Focus on retention programs',
    ]
  });

  // KPIs
  pdfService.addContentPage('Key Metrics');
  pdfService.addKPICards([
    { label: 'Revenue', value: '$150K', change: '+30%', changeType: 'positive' },
    { label: 'Users', value: '2,500', change: '+15%', changeType: 'positive' },
  ]);

  // Charts
  if (chartRef.current) {
    await pdfService.addChart(chartRef.current, 'Revenue Trend');
  }

  // Data Table
  pdfService.addPremiumTable({
    title: 'Top Customers',
    head: ['Name', 'Revenue', 'Status'],
    body: [
      ['Customer A', '$5,000', 'Active'],
      ['Customer B', '$4,500', 'Active'],
    ],
    summary: [{ label: 'Total', value: '$9,500' }]
  });

  // Finalize
  pdfService.addFooters('Q4 2024 Analytics Report');
  pdfService.save('q4-analytics-2024');
};
```

## Styling Customization

The service uses ReelFlix brand colors by default:
- **Primary**: Pink `[255, 20, 147]`
- **Secondary**: Purple `[147, 51, 234]`
- **Text Dark**: `[17, 24, 39]`
- **Text Light**: `[107, 114, 128]`

To customize colors, modify the class properties in `premiumPdfService.ts`.

## Tips for Best Results

1. **Chart Quality**: Use high-resolution charts (scale: 2) for crisp images
2. **Page Breaks**: Use `checkPageBreak()` before adding large content
3. **Table Data**: Limit tables to ~50 rows per page for readability
4. **Executive Summaries**: Keep highlights concise (1 line each)
5. **File Size**: Optimize chart images if PDFs become too large

## Migration from Old PDF Code

**Before:**
```typescript
const pdf = new jsPDF();
pdf.text('Title', 20, 20);
autoTable(pdf, { ... });
pdf.save('report.pdf');
```

**After:**
```typescript
const pdfService = new PremiumPDFService();
pdfService.createCoverPage({ title: 'Title', ... });
pdfService.addPremiumTable({ ... });
pdfService.addFooters('Report');
pdfService.save('report');
```

## Examples in Codebase

- **Analytics Report**: `src/pages/admin/Analytics.tsx`
- **Payment Report**: `src/pages/admin/Payments.tsx`
- See these files for complete implementation examples

---

**Questions or improvements?** Update this guide or the service class as needed!