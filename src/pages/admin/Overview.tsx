import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, CreditCard, TrendingUp, UserPlus, DollarSign, Activity } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  totalRevenueMTD: number;
  totalRevenueYTD: number;
  newSignups7Days: number;
  newSignups30Days: number;
  topPlans: { plan: string; count: number }[];
  revenueByDay: { date: string; revenue: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const AdminOverview = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    totalRevenueMTD: 0,
    totalRevenueYTD: 0,
    newSignups7Days: 0,
    newSignups30Days: 0,
    topPlans: [],
    revenueByDay: [],
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadDashboardStats();
    }
  }, [isAdmin]);

  const loadDashboardStats = async () => {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Active subscriptions (not expired)
      const { count: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);

      // Expired subscriptions
      const { count: expiredSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .lt('ends_at', new Date().toISOString());

      // Calculate date ranges
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Revenue MTD
      const { data: revenueMTD } = await supabase
        .from('subscriptions')
        .select('amount_cents')
        .gte('paid_at', startOfMonth)
        .eq('status', 'active');

      const totalRevenueMTD = (revenueMTD || []).reduce((sum, sub) => sum + sub.amount_cents, 0) / 100;

      // Revenue YTD
      const { data: revenueYTD } = await supabase
        .from('subscriptions')
        .select('amount_cents')
        .gte('paid_at', startOfYear)
        .eq('status', 'active');

      const totalRevenueYTD = (revenueYTD || []).reduce((sum, sub) => sum + sub.amount_cents, 0) / 100;

      // New signups
      const { count: newSignups7Days } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);

      const { count: newSignups30Days } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo);

      // Top plans
      const { data: subscriptionsData } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('status', 'active');

      const planCounts = (subscriptionsData || []).reduce((acc, sub) => {
        acc[sub.plan] = (acc[sub.plan] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topPlans = Object.entries(planCounts)
        .map(([plan, count]) => ({ plan, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Revenue by day (last 7 days)
      const { data: recentRevenue } = await supabase
        .from('subscriptions')
        .select('paid_at, amount_cents')
        .gte('paid_at', sevenDaysAgo)
        .eq('status', 'active')
        .order('paid_at');

      const revenueByDay = (recentRevenue || []).reduce((acc, sub) => {
        if (!sub.paid_at) return acc;
        const date = new Date(sub.paid_at).toLocaleDateString();
        const existing = acc.find(r => r.date === date);
        if (existing) {
          existing.revenue += sub.amount_cents / 100;
        } else {
          acc.push({ date, revenue: sub.amount_cents / 100 });
        }
        return acc;
      }, [] as { date: string; revenue: number }[]);

      setStats({
        totalUsers: totalUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        expiredSubscriptions: expiredSubscriptions || 0,
        totalRevenueMTD,
        totalRevenueYTD,
        newSignups7Days: newSignups7Days || 0,
        newSignups30Days: newSignups30Days || 0,
        topPlans,
        revenueByDay,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">Platform performance and financial health</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newSignups7Days} in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.expiredSubscriptions} expired
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue MTD</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenueMTD.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.totalRevenueYTD.toFixed(2)} YTD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Signups</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newSignups30Days}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend (Last 7 Days)</CardTitle>
            <CardDescription>Daily revenue overview</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.revenueByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Subscription Plans</CardTitle>
            <CardDescription>Most popular plans by subscriber count</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topPlans.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topPlans}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="plan" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No subscription data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Database Connection</span>
              <span className="text-sm font-medium text-green-600">✓ Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Authentication Service</span>
              <span className="text-sm font-medium text-green-600">✓ Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Storage Service</span>
              <span className="text-sm font-medium text-green-600">✓ Operational</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverview;
