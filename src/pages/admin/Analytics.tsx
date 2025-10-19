import { useState, useEffect } from "react";
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

interface AnalyticsData {
  totalSubscribers: number;
  activeSubscribers: number;
  totalRevenue: number;
  churnRate: number;
  newSubscribers: number;
  subscriberGrowth: { date: string; count: number }[];
  revenueData: { date: string; revenue: number; churn: number }[];
  deviceStats: { device: string; users: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdminAnalytics = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
    }
  }, [isAdmin, dateRange, startDate, endDate]);

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
      const activeSubscribers = subscriptions?.filter(s => s.status === 'paid').length || 0;
      const totalRevenue = subscriptions?.reduce((sum, s) => sum + (s.amount_cents || 0), 0) / 100 || 0;
      
      // Calculate new subscribers in period
      const newSubscribers = subscriptions?.filter(s => {
        const createdDate = new Date(s.created_at);
        return createdDate >= startDateCalc;
      }).length || 0;

      // Calculate churn rate (cancelled vs active)
      const cancelledSubs = subscriptions?.filter(s => s.status === 'cancelled').length || 0;
      const churnRate = totalSubscribers > 0 ? (cancelledSubs / totalSubscribers) * 100 : 0;

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
        
        if (sub.status === 'paid') {
          current.revenue += (sub.amount_cents || 0) / 100;
        } else if (sub.status === 'cancelled') {
          current.churn += 1;
        }
        
        revenueByDay.set(date, current);
      });
      
      const revenueData = Array.from(revenueByDay.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30);

      // Mock device stats (in real app, you'd track this)
      const deviceStats = [
        { device: 'Mobile', users: Math.floor(totalSubscribers * 0.4) },
        { device: 'Smart TV', users: Math.floor(totalSubscribers * 0.35) },
        { device: 'Web', users: Math.floor(totalSubscribers * 0.25) },
      ];

      setAnalyticsData({
        totalSubscribers,
        activeSubscribers,
        totalRevenue,
        churnRate,
        newSubscribers,
        subscriberGrowth,
        revenueData,
        deviceStats,
      });
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

  const exportToCSV = () => {
    if (!analyticsData) return;

    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Subscribers', analyticsData.totalSubscribers],
      ['Active Subscribers', analyticsData.activeSubscribers],
      ['Total Revenue', `$${analyticsData.totalRevenue.toFixed(2)}`],
      ['Churn Rate', `${analyticsData.churnRate.toFixed(2)}%`],
      ['New Subscribers', analyticsData.newSubscribers],
      ['', ''],
      ['Date', 'Subscriber Count'],
      ...analyticsData.subscriberGrowth.map(d => [d.date, d.count]),
      ['', ''],
      ['Device', 'Users'],
      ...analyticsData.deviceStats.map(d => [d.device, d.users]),
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Analytics data exported successfully"
    });
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
        
        <Button onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
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
            
            <div className="flex-1">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="flex-1">
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
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

        <Card>
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

        <Card>
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

        <Card>
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

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscriber Growth</CardTitle>
            <CardDescription>Daily new subscribers over time</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Churn</CardTitle>
            <CardDescription>Daily revenue and churn comparison</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Usage</CardTitle>
            <CardDescription>Subscribers by device type</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Average Revenue per User</span>
              <span className="text-sm font-bold">
                ${(analyticsData.totalRevenue / analyticsData.totalSubscribers || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Growth Rate</span>
              <span className="text-sm font-bold text-green-600">
                +{((analyticsData.newSubscribers / analyticsData.totalSubscribers) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Retention Rate</span>
              <span className="text-sm font-bold text-blue-600">
                {(100 - analyticsData.churnRate).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Most Popular Device</span>
              <span className="text-sm font-bold">
                {analyticsData.deviceStats.reduce((max, d) => d.users > max.users ? d : max).device}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;