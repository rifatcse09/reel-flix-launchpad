import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, TrendingUp, DollarSign, Users, Activity } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { PlanMixChart } from "@/components/admin/PlanMixChart";
import { ARPUChart } from "@/components/admin/ARPUChart";
import { ActivityHeatmap } from "@/components/admin/ActivityHeatmap";
import { CohortRetentionChart } from "@/components/admin/CohortRetentionChart";
import { LTVProjectionWidget } from "@/components/admin/LTVProjectionWidget";
import { ComparisonMetrics } from "@/components/admin/ComparisonMetrics";
import { AnimatedKPICards } from "@/components/admin/AnimatedKPICards";
import { RevenueForecastRing } from "@/components/admin/RevenueForecastRing";
import { PlanGrowthTreeMap } from "@/components/admin/PlanGrowthTreeMap";
import { DeviceTrendGraph } from "@/components/admin/DeviceTrendGraph";
import { ExecutiveSummaryCard } from "@/components/admin/ExecutiveSummaryCard";
import { LiveModeIndicator } from "@/components/admin/LiveModeIndicator";

interface AnalyticsData {
  totalSubscribers: number;
  activeSubscribers: number;
  totalRevenue: number;
  churnRate: number;
  newSubscribers: number;
  subscriberGrowth: { date: string; count: number }[];
  revenueData: { date: string; revenue: number; churn: number }[];
  deviceStats: { device: string; users: number }[];
  transactions: any[];
  sessions: any[];
}

interface ComparisonData {
  totalRevenue: number;
  activeSubscribers: number;
  newSubscribers: number;
  churnRate: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdminAnalytics = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [previousData, setPreviousData] = useState<ComparisonData | null>(null);
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comparisonMode, setComparisonMode] = useState<'month' | 'year' | null>('month');
  const [highlightedMetric, setHighlightedMetric] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const growthChartRef = useRef<HTMLDivElement>(null);
  const revenueChartRef = useRef<HTMLDivElement>(null);
  const deviceChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
      
      // Auto-refresh every 60 seconds
      const interval = setInterval(() => {
        loadAnalytics();
        setLastUpdate(new Date());
        toast({
          title: "Data Refreshed",
          description: "Analytics updated with latest data",
        });
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [isAdmin, dateRange, startDate, endDate, comparisonMode]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const now = new Date();
      let startDateCalc = new Date();
      
      if (startDate && endDate) {
        startDateCalc = new Date(startDate);
      } else {
        startDateCalc.setDate(now.getDate() - parseInt(dateRange));
      }

      // Get all subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .gte('created_at', startDateCalc.toISOString());

      if (subsError) throw subsError;

      // Calculate metrics
      const totalSubscribers = subscriptions?.length || 0;
      const activeSubscribers = subscriptions?.filter(s => s.status === 'active').length || 0;
      const totalRevenue = subscriptions?.reduce((sum, s) => sum + (s.amount_cents || 0), 0) / 100 || 0;
      
      // Calculate new subscribers in period
      const newSubscribers = subscriptions?.filter(s => {
        const createdDate = new Date(s.created_at);
        return createdDate >= startDateCalc;
      }).length || 0;

      // Calculate churn rate (expired/cancelled vs total)
      const churnedSubs = subscriptions?.filter(s => 
        s.status === 'expired' || s.status === 'cancelled'
      ).length || 0;
      const churnRate = totalSubscribers > 0 ? (churnedSubs / totalSubscribers) * 100 : 0;

      // Subscriber growth by day
      const growthByDay = new Map<string, number>();
      subscriptions?.forEach(sub => {
        const date = new Date(sub.created_at).toLocaleDateString();
        growthByDay.set(date, (growthByDay.get(date) || 0) + 1);
      });
      
      const subscriberGrowth = Array.from(growthByDay.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30); // Last 30 days

      // Revenue vs Churn by day
      const revenueByDay = new Map<string, { revenue: number; churn: number }>();
      subscriptions?.forEach(sub => {
        const date = new Date(sub.created_at).toLocaleDateString();
        const current = revenueByDay.get(date) || { revenue: 0, churn: 0 };
        
        if (sub.status === 'active' || sub.paid_at) {
          current.revenue += (sub.amount_cents || 0) / 100;
        }
        if (sub.status === 'expired' || sub.status === 'cancelled') {
          current.churn += 1;
        }
        
        revenueByDay.set(date, current);
      });
      
      const revenueData = Array.from(revenueByDay.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30);

      // Get device sessions
      const { data: deviceSessions, error: deviceError } = await supabase
        .from('user_sessions')
        .select('*')
        .gte('last_accessed_at', startDateCalc.toISOString());

      if (deviceError) throw deviceError;

      // Count devices
      const deviceCounts = new Map<string, number>();
      deviceSessions?.forEach(session => {
        const type = session.device_type;
        deviceCounts.set(type, (deviceCounts.get(type) || 0) + 1);
      });

      const deviceStats = [
        { device: 'Mobile', users: deviceCounts.get('mobile') || 0 },
        { device: 'Tablet', users: deviceCounts.get('tablet') || 0 },
        { device: 'Desktop', users: deviceCounts.get('desktop') || 0 },
        { device: 'Smart TV', users: deviceCounts.get('smart_tv') || 0 },
      ].filter(d => d.users > 0);

      setAnalyticsData({
        totalSubscribers,
        activeSubscribers,
        totalRevenue,
        churnRate,
        newSubscribers,
        subscriberGrowth,
        revenueData,
        deviceStats,
        transactions: subscriptions || [],
        sessions: deviceSessions || [],
      });
      
      setLastUpdate(new Date());

      // Load comparison data if enabled
      if (comparisonMode) {
        const comparisonStartDate = new Date(startDateCalc);
        const comparisonEndDate = new Date(startDateCalc);
        
        if (comparisonMode === 'month') {
          comparisonStartDate.setMonth(comparisonStartDate.getMonth() - 1);
          comparisonEndDate.setMonth(comparisonEndDate.getMonth() - 1);
        } else {
          comparisonStartDate.setFullYear(comparisonStartDate.getFullYear() - 1);
          comparisonEndDate.setFullYear(comparisonEndDate.getFullYear() - 1);
        }

        const { data: comparisonSubs } = await supabase
          .from('subscriptions')
          .select('*')
          .gte('created_at', comparisonStartDate.toISOString())
          .lte('created_at', comparisonEndDate.toISOString());

        if (comparisonSubs) {
          const compTotalSubscribers = comparisonSubs.length;
          const compActiveSubscribers = comparisonSubs.filter(s => s.status === 'active').length;
          const compTotalRevenue = comparisonSubs.reduce((sum, s) => sum + (s.amount_cents || 0), 0) / 100;
          const compNewSubscribers = comparisonSubs.filter(s => {
            const createdDate = new Date(s.created_at);
            return createdDate >= comparisonStartDate;
          }).length;
          const compChurnedSubs = comparisonSubs.filter(s => s.status === 'expired' || s.status === 'cancelled').length;
          const compChurnRate = compTotalSubscribers > 0 ? (compChurnedSubs / compTotalSubscribers) * 100 : 0;

          setPreviousData({
            totalRevenue: compTotalRevenue,
            activeSubscribers: compActiveSubscribers,
            newSubscribers: compNewSubscribers,
            churnRate: compChurnRate,
          });
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!analyticsData) return;

    setExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Header
      pdf.setFillColor(255, 20, 147); // Pink color
      pdf.rect(0, 0, pageWidth, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Analytics & Reports', pageWidth / 2, 20, { align: 'center' });
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Comprehensive Business Intelligence Report', pageWidth / 2, 30, { align: 'center' });

      yPosition = 50;
      pdf.setTextColor(0, 0, 0);

      // Date Range
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      const reportDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      pdf.text(`Generated: ${reportDate}`, 20, yPosition);
      pdf.text(`Period: Last ${dateRange} Days`, pageWidth - 20, yPosition, { align: 'right' });
      
      yPosition += 15;

      // Key Metrics Section
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Key Performance Indicators', 20, yPosition);
      yPosition += 10;

      // Metrics Table
      autoTable(pdf, {
        startY: yPosition,
        head: [['Metric', 'Value', 'Details']],
        body: [
          ['Total Subscribers', analyticsData.totalSubscribers.toString(), `+${analyticsData.newSubscribers} new this period`],
          ['Active Subscribers', analyticsData.activeSubscribers.toString(), `${((analyticsData.activeSubscribers / analyticsData.totalSubscribers) * 100).toFixed(1)}% of total`],
          ['Total Revenue', `$${analyticsData.totalRevenue.toFixed(2)}`, 'From all subscriptions'],
          ['Churn Rate', `${analyticsData.churnRate.toFixed(1)}%`, 'Cancelled vs total'],
          ['Avg Revenue/User', `$${(analyticsData.totalRevenue / analyticsData.totalSubscribers || 0).toFixed(2)}`, 'Per subscriber'],
          ['Retention Rate', `${(100 - analyticsData.churnRate).toFixed(1)}%`, 'Active retention'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [255, 20, 147], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { cellWidth: 40, halign: 'right' },
          2: { cellWidth: 90 }
        }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // Capture and add charts
      if (growthChartRef.current) {
        pdf.addPage();
        yPosition = 20;
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Subscriber Growth Analysis', 20, yPosition);
        yPosition += 10;

        const canvas = await html2canvas(growthChartRef.current, { 
          backgroundColor: '#ffffff',
          scale: 2 
        });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 20, yPosition, pageWidth - 40, 80);
        yPosition += 90;
      }

      if (revenueChartRef.current && yPosition + 90 > pageHeight) {
        pdf.addPage();
        yPosition = 20;
      }

      if (revenueChartRef.current) {
        if (yPosition === 20) {
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Revenue vs Churn Analysis', 20, yPosition);
          yPosition += 10;
        }

        const canvas = await html2canvas(revenueChartRef.current, { 
          backgroundColor: '#ffffff',
          scale: 2 
        });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 20, yPosition, pageWidth - 40, 80);
        yPosition += 90;
      }

      // Device Usage
      pdf.addPage();
      yPosition = 20;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Device Usage Distribution', 20, yPosition);
      yPosition += 10;

      if (deviceChartRef.current) {
        const canvas = await html2canvas(deviceChartRef.current, { 
          backgroundColor: '#ffffff',
          scale: 2 
        });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 20, yPosition, pageWidth - 40, 80);
        yPosition += 90;
      }

      // Device Stats Table
      autoTable(pdf, {
        startY: yPosition,
        head: [['Device Type', 'Users', 'Percentage']],
        body: analyticsData.deviceStats.map(d => {
          const totalDeviceUsers = analyticsData.deviceStats.reduce((sum, device) => sum + device.users, 0);
          const percentage = ((d.users / totalDeviceUsers) * 100).toFixed(1);
          return [d.device, d.users.toString(), `${percentage}%`];
        }),
        theme: 'striped',
        headStyles: { fillColor: [255, 20, 147], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
      });

      // Footer on every page
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text('ReelFlix Analytics Report - Confidential', pageWidth / 2, pageHeight - 5, { align: 'center' });
      }

      pdf.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Export Complete",
        description: "Professional PDF report generated successfully"
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin || !analyticsData) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground">Comprehensive insights and statistics</p>
        </div>
        
        <div className="flex items-center gap-4">
          <LiveModeIndicator lastUpdate={lastUpdate} />
          <Button onClick={exportToPDF} disabled={exporting} variant="cta">
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export PDF Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <ExecutiveSummaryCard
        data={{
          totalRevenue: analyticsData.totalRevenue,
          previousRevenue: previousData?.totalRevenue || analyticsData.totalRevenue * 0.9,
          activeSubscribers: analyticsData.activeSubscribers,
          previousSubscribers: previousData?.activeSubscribers || analyticsData.activeSubscribers * 0.95,
          churnRate: analyticsData.churnRate,
          previousChurn: previousData?.churnRate || analyticsData.churnRate,
          arpu: analyticsData.totalRevenue / analyticsData.totalSubscribers || 0,
          previousArpu: previousData ? previousData.totalRevenue / (previousData.activeSubscribers || 1) : 0,
        }}
      />

      {/* Date Range & Comparison Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range & Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 items-end">
            <div>
              <Label htmlFor="quick-range">Quick Select</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger id="quick-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="comparison-mode">Compare With</Label>
              <Select 
                value={comparisonMode || 'none'} 
                onValueChange={(v) => setComparisonMode(v === 'none' ? null : v as 'month' | 'year')}
              >
                <SelectTrigger id="comparison-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="none">No Comparison</SelectItem>
                  <SelectItem value="month">vs Last Month</SelectItem>
                  <SelectItem value="year">vs Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Metrics */}
      {comparisonMode && previousData && (
        <ComparisonMetrics
          current={{
            totalRevenue: analyticsData.totalRevenue,
            activeSubscribers: analyticsData.activeSubscribers,
            newSubscribers: analyticsData.newSubscribers,
            churnRate: analyticsData.churnRate,
          }}
          previous={previousData}
          comparisonLabel={comparisonMode === 'month' ? 'This Month vs Last Month' : 'This Year vs Last Year'}
        />
      )}

      {/* Animated KPI Cards */}
      <AnimatedKPICards
        kpis={[
          {
            label: 'Total Revenue',
            value: analyticsData.totalRevenue,
            previousValue: previousData?.totalRevenue || analyticsData.totalRevenue * 0.9,
            format: 'currency',
            icon: 'revenue',
          },
          {
            label: 'Active Subscribers',
            value: analyticsData.activeSubscribers,
            previousValue: previousData?.activeSubscribers || analyticsData.activeSubscribers * 0.95,
            format: 'number',
            icon: 'users',
          },
          {
            label: 'ARPU',
            value: analyticsData.totalRevenue / analyticsData.totalSubscribers || 0,
            previousValue: previousData ? previousData.totalRevenue / (previousData.activeSubscribers || 1) : 0,
            format: 'currency',
            icon: 'arpu',
          },
          {
            label: 'Churn Rate',
            value: analyticsData.churnRate,
            previousValue: previousData?.churnRate || analyticsData.churnRate,
            format: 'percentage',
            icon: 'churn',
          },
          {
            label: 'Growth Rate',
            value: (analyticsData.newSubscribers / analyticsData.totalSubscribers) * 100 || 0,
            previousValue: previousData ? (previousData.newSubscribers / previousData.activeSubscribers) * 100 : 0,
            format: 'percentage',
            icon: 'growth',
          },
        ]}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all ${highlightedMetric === 'total' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => {
            setHighlightedMetric('total');
            toast({
              title: "Total Subscribers",
              description: `Viewing all ${analyticsData.totalSubscribers} subscribers`,
            });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalSubscribers}</div>
            <p className="text-xs text-muted-foreground">
              +{analyticsData.newSubscribers} new this period
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all ${highlightedMetric === 'active' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => {
            setHighlightedMetric('active');
            toast({
              title: "Active Subscribers",
              description: `${analyticsData.activeSubscribers} active subscriptions`,
            });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.activeSubscribers}</div>
            <p className="text-xs text-muted-foreground">
              {((analyticsData.activeSubscribers / analyticsData.totalSubscribers) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all ${highlightedMetric === 'revenue' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => {
            setHighlightedMetric('revenue');
            toast({
              title: "Total Revenue",
              description: `$${analyticsData.totalRevenue.toFixed(2)} generated`,
            });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analyticsData.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From all subscriptions
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all ${highlightedMetric === 'churn' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => {
            setHighlightedMetric('churn');
            toast({
              title: "Churn Rate",
              description: `${analyticsData.churnRate.toFixed(1)}% churn rate`,
            });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.churnRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Cancelled vs total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Forecast & Plan Concentration */}
      <div className="grid gap-6 md:grid-cols-2">
        <RevenueForecastRing
          currentRevenue={analyticsData.totalRevenue}
          goalRevenue={5000}
        />
        <PlanGrowthTreeMap transactions={analyticsData.transactions} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscriber Growth</CardTitle>
            <CardDescription>Daily new subscribers over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={growthChartRef}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.subscriberGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" name="New Subscribers" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Churn</CardTitle>
            <CardDescription>Daily revenue and churn comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={revenueChartRef}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#82ca9d" name="Revenue ($)" />
                  <Bar dataKey="churn" fill="#ff8042" name="Churned Users" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <DeviceTrendGraph sessions={analyticsData.sessions} />

        <Card>
          <CardHeader>
            <CardTitle>Device Usage</CardTitle>
            <CardDescription>Subscribers by device type</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={deviceChartRef}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.deviceStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ device, users }) => `${device}: ${users}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="users"
                  >
                    {analyticsData.deviceStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <LTVProjectionWidget
          arpu={analyticsData.totalRevenue / analyticsData.totalSubscribers || 0}
          churnRate={analyticsData.churnRate}
          totalRevenue={analyticsData.totalRevenue}
          totalUsers={analyticsData.totalSubscribers}
        />
      </div>

      {/* Advanced Analytics Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <PlanMixChart transactions={analyticsData.transactions} />
        <ARPUChart transactions={analyticsData.transactions} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ActivityHeatmap sessions={analyticsData.sessions} />
        <CohortRetentionChart subscriptions={analyticsData.transactions} />
      </div>
    </div>
  );
};


export default AdminAnalytics;