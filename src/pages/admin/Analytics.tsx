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
import { PremiumPDFService } from "@/utils/premiumPdfService";
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
import { AlertsWidget } from "@/components/admin/AlertsWidget";

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
      const pdfService = new PremiumPDFService();

      // Cover Page
      pdfService.createCoverPage({
        title: 'Analytics & Insights Report',
        subtitle: 'Comprehensive Business Intelligence Dashboard',
        reportType: 'Analytics Report',
        dateRange: startDate && endDate 
          ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
          : `Last ${dateRange} Days`,
      });

      // Executive Summary Page
      pdfService.addContentPage();
      
      const avgRevenuePerUser = analyticsData.totalRevenue / analyticsData.totalSubscribers || 0;
      const retentionRate = 100 - analyticsData.churnRate;
      const growthRate = previousData?.activeSubscribers 
        ? ((analyticsData.activeSubscribers - previousData.activeSubscribers) / previousData.activeSubscribers) * 100
        : 0;

      pdfService.addExecutiveSummary({
        highlights: [
          `Total Revenue: $${analyticsData.totalRevenue.toFixed(2)} from ${analyticsData.totalSubscribers} subscribers`,
          `${analyticsData.newSubscribers} new subscribers acquired during this period`,
          `Customer retention rate: ${retentionRate.toFixed(1)}%`,
          `Average revenue per user: $${avgRevenuePerUser.toFixed(2)}`,
        ],
        insights: [
          `The platform shows ${growthRate > 0 ? 'positive' : 'negative'} growth momentum with a ${Math.abs(growthRate).toFixed(1)}% change in active subscribers compared to the previous period.`,
          `Current churn rate of ${analyticsData.churnRate.toFixed(1)}% ${analyticsData.churnRate < 5 ? 'indicates excellent' : analyticsData.churnRate < 10 ? 'shows healthy' : 'requires attention to'} customer retention.`,
          `Device distribution analysis reveals ${analyticsData.deviceStats[0]?.device || 'mobile'} as the primary access point with ${analyticsData.deviceStats[0]?.users || 0} users.`,
        ],
        recommendations: [
          analyticsData.churnRate > 10 ? 'Implement customer retention programs to reduce churn rate' : 'Continue current retention strategies',
          `Focus marketing efforts on ${analyticsData.deviceStats[0]?.device || 'mobile'} platform optimization`,
          avgRevenuePerUser < 50 ? 'Consider premium tier offerings to increase ARPU' : 'Maintain current pricing strategy',
        ]
      });

      // Key Metrics Page
      pdfService.addContentPage('Key Performance Indicators');
      
      const revenueChange = previousData?.totalRevenue 
        ? ((analyticsData.totalRevenue - previousData.totalRevenue) / previousData.totalRevenue) * 100
        : 0;
      
      const subscriberChange = previousData?.activeSubscribers
        ? ((analyticsData.activeSubscribers - previousData.activeSubscribers) / previousData.activeSubscribers) * 100
        : 0;

      pdfService.addKPICards([
        {
          label: 'Total Revenue',
          value: `$${analyticsData.totalRevenue.toFixed(2)}`,
          change: `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%`,
          changeType: revenueChange > 0 ? 'positive' : 'negative'
        },
        {
          label: 'Active Subscribers',
          value: analyticsData.activeSubscribers.toString(),
          change: `${subscriberChange > 0 ? '+' : ''}${subscriberChange.toFixed(1)}%`,
          changeType: subscriberChange > 0 ? 'positive' : 'negative'
        },
        {
          label: 'New Signups',
          value: analyticsData.newSubscribers.toString(),
          changeType: 'neutral'
        },
        {
          label: 'Churn Rate',
          value: `${analyticsData.churnRate.toFixed(1)}%`,
          changeType: analyticsData.churnRate < 5 ? 'positive' : analyticsData.churnRate > 10 ? 'negative' : 'neutral'
        },
        {
          label: 'Avg Revenue/User',
          value: `$${avgRevenuePerUser.toFixed(2)}`,
          changeType: 'neutral'
        },
        {
          label: 'Retention Rate',
          value: `${retentionRate.toFixed(1)}%`,
          changeType: retentionRate > 90 ? 'positive' : 'neutral'
        },
      ]);

      // Detailed Metrics Table
      pdfService.addPremiumTable({
        title: 'Comprehensive Metrics Overview',
        head: ['Metric', 'Current Value', 'Details'],
        body: [
          ['Total Subscribers', analyticsData.totalSubscribers.toString(), `+${analyticsData.newSubscribers} this period`],
          ['Active Subscriptions', analyticsData.activeSubscribers.toString(), `${((analyticsData.activeSubscribers / analyticsData.totalSubscribers) * 100).toFixed(1)}% active rate`],
          ['Total Revenue', `$${analyticsData.totalRevenue.toFixed(2)}`, 'All-time revenue'],
          ['Average Order Value', `$${avgRevenuePerUser.toFixed(2)}`, 'Per subscriber'],
          ['Churn Rate', `${analyticsData.churnRate.toFixed(1)}%`, 'Cancelled/Expired vs Total'],
          ['Retention Rate', `${retentionRate.toFixed(1)}%`, 'Currently active users'],
          ['Growth Rate', `${growthRate.toFixed(1)}%`, 'vs previous period'],
        ],
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
          2: { cellWidth: 'auto' },
        },
        summary: [
          { label: 'Total Users', value: analyticsData.totalSubscribers.toString() },
          { label: 'Total Revenue', value: `$${analyticsData.totalRevenue.toFixed(2)}` },
          { label: 'Avg/User', value: `$${avgRevenuePerUser.toFixed(2)}` },
        ]
      });

      // Charts Page
      pdfService.addContentPage('Growth & Revenue Analysis');
      
      if (growthChartRef.current) {
        await pdfService.addChart(
          growthChartRef.current,
          'Subscriber Growth Trend',
          'Daily new subscriber acquisition over the reporting period'
        );
      }

      if (revenueChartRef.current) {
        await pdfService.addChart(
          revenueChartRef.current,
          'Revenue vs Churn Analysis',
          'Revenue generation trends compared to subscription churn'
        );
      }

      // Device Analytics Page
      pdfService.addContentPage('Device & Platform Analysis');
      
      if (deviceChartRef.current) {
        await pdfService.addChart(
          deviceChartRef.current,
          'Device Distribution',
          'User access patterns across different device types'
        );
      }

      const totalDeviceUsers = analyticsData.deviceStats.reduce((sum, d) => sum + d.users, 0);
      pdfService.addPremiumTable({
        title: 'Device Usage Breakdown',
        head: ['Device Type', 'Users', 'Percentage', 'Trend'],
        body: analyticsData.deviceStats.map(d => [
          d.device,
          d.users.toString(),
          `${((d.users / totalDeviceUsers) * 100).toFixed(1)}%`,
          d.users > totalDeviceUsers / 4 ? 'High Usage' : 'Standard'
        ]),
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'right' },
          2: { halign: 'right', fontStyle: 'bold' },
          3: { halign: 'center' },
        },
        summary: [
          { label: 'Total Sessions', value: totalDeviceUsers.toString() },
          { label: 'Primary Device', value: analyticsData.deviceStats[0]?.device || 'N/A' },
        ]
      });

      // Add footers and save
      pdfService.addFooters('ReelFlix Analytics Report');
      pdfService.save('reelflix-analytics-report');

      toast({
        title: "Premium Report Generated",
        description: "Your professional PDF report has been created successfully",
      });
    } catch (error) {
      console.error('Error generating premium PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate premium PDF report",
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

      {/* Alert Configuration */}
      <AlertsWidget />
    </div>
  );
};


export default AdminAnalytics;