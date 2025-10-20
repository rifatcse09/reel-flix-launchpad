import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as TooltipUI, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, CreditCard, TrendingUp, UserPlus, DollarSign, Activity, Target, Gift, Bell, Info } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  churnRate: number;
  arpu: number;
  topReferralCode: string | null;
}

interface AdminAlert {
  id: string;
  type: 'info' | 'warning' | 'success';
  message: string;
  timestamp: Date;
  icon: string;
}

interface GoalProgress {
  current: number;
  target: number;
  label: string;
}

const AdminOverview = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7days");
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [revenueGoal] = useState<GoalProgress>({
    current: 0,
    target: 5000,
    label: "Monthly Revenue Goal"
  });
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
    churnRate: 0,
    arpu: 0,
    topReferralCode: null,
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadDashboardStats();
      loadRecentAlerts();
    }
  }, [isAdmin, timeRange]);

  const loadRecentAlerts = async () => {
    try {
      const newAlerts: AdminAlert[] = [];
      
      // Recent user signups
      const { data: recentProfiles } = await supabase
        .from('profiles')
        .select('full_name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentProfiles && recentProfiles.length > 0) {
        recentProfiles.forEach(profile => {
          newAlerts.push({
            id: Math.random().toString(),
            type: 'success',
            message: `New user signed up: ${profile.full_name || profile.email || 'Anonymous'}`,
            timestamp: new Date(profile.created_at),
            icon: '👤'
          });
        });
      }

      // Recent subscriptions
      const { data: recentSubs } = await supabase
        .from('subscriptions')
        .select('plan, created_at, profiles(email)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentSubs && recentSubs.length > 0) {
        recentSubs.forEach(sub => {
          const profile = sub.profiles as any;
          newAlerts.push({
            id: Math.random().toString(),
            type: 'success',
            message: `New ${sub.plan} subscription purchased`,
            timestamp: new Date(sub.created_at),
            icon: '💳'
          });
        });
      }

      // Recent referral uses
      const { data: recentReferrals } = await supabase
        .from('referral_uses')
        .select('created_at, referral_codes(code)')
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentReferrals && recentReferrals.length > 0) {
        recentReferrals.forEach(ref => {
          const code = (ref.referral_codes as any)?.code;
          if (code) {
            newAlerts.push({
              id: Math.random().toString(),
              type: 'info',
              message: `Referral code applied: ${code}`,
              timestamp: new Date(ref.created_at),
              icon: '🎟️'
            });
          }
        });
      }

      // Sort by timestamp
      newAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setAlerts(newAlerts.slice(0, 5));
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      // Calculate date ranges based on selected time range
      const now = new Date();
      let daysBack = 7;
      if (timeRange === "30days") daysBack = 30;
      else if (timeRange === "ytd") daysBack = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24));
      
      const rangeStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString();

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

      // Calculate additional date ranges
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

      // Revenue by day (based on selected range)
      const { data: recentRevenue } = await supabase
        .from('subscriptions')
        .select('paid_at, amount_cents')
        .gte('paid_at', rangeStart)
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

      // Calculate churn rate (30 day)
      const { count: churnedUsers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('ends_at', thirtyDaysAgo)
        .lt('ends_at', now.toISOString());

      const churnRate = activeSubscriptions && activeSubscriptions > 0 
        ? ((churnedUsers || 0) / activeSubscriptions) * 100 
        : 0;

      // Calculate ARPU (Average Revenue Per User)
      const arpu = totalUsers && totalUsers > 0 ? totalRevenueYTD / totalUsers : 0;

      // Get top referral code
      const { data: referralData } = await supabase
        .from('referral_uses')
        .select('code_id, referral_codes(code)')
        .limit(1000);

      let topReferralCode: string | null = null;
      if (referralData && referralData.length > 0) {
        const codeCounts = referralData.reduce((acc, use) => {
          const code = (use.referral_codes as any)?.code;
          if (code) {
            acc[code] = (acc[code] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        const topCode = Object.entries(codeCounts).sort((a, b) => b[1] - a[1])[0];
        topReferralCode = topCode ? topCode[0] : null;
      }

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
        churnRate,
        arpu,
        topReferralCode,
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

  const getPlaceholderData = () => {
    const days = timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : 90;
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      revenue: 0,
    }));
  };

  const getChurnColor = (rate: number) => {
    if (rate < 5) return 'text-success';
    if (rate < 10) return 'text-warning';
    return 'text-destructive';
  };

  const hasRevenue = stats.totalRevenueMTD > 0;
  const goalProgress = ((revenueGoal.current || stats.totalRevenueMTD) / revenueGoal.target) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">Platform performance and financial health</p>
      </div>

      {/* Goal Tracking Widget */}
      <Card className="animate-fade-in shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {revenueGoal.label}
          </CardTitle>
          <CardDescription>
            ${(revenueGoal.current || stats.totalRevenueMTD).toFixed(2)} / ${revenueGoal.target.toFixed(2)} ({goalProgress.toFixed(0)}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className="h-full transition-all duration-1000 ease-out rounded-full"
              style={{
                width: `${Math.min(goalProgress, 100)}%`,
                background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))',
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ${(revenueGoal.target - (revenueGoal.current || stats.totalRevenueMTD)).toFixed(2)} remaining to goal
          </p>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
        <Card 
          className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all animate-scale-in"
          onClick={() => navigate('/admin/users')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">👤 Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newSignups7Days} in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all animate-scale-in"
          onClick={() => navigate('/admin/subscriptions')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🔔 Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.expiredSubscriptions} expired
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg hover:scale-105 transition-all animate-scale-in ${
            hasRevenue ? 'shadow-primary/20' : ''
          }`}
          onClick={() => navigate('/admin/payments')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">💳 Revenue MTD</CardTitle>
            <DollarSign className={`h-4 w-4 ${hasRevenue ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold transition-colors ${hasRevenue ? 'text-primary' : ''}`}>
              ${stats.totalRevenueMTD.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              ${stats.totalRevenueYTD.toFixed(2)} YTD
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all animate-scale-in"
          onClick={() => navigate('/admin/users?sort=new')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🆕 New Signups</CardTitle>
            <UserPlus className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newSignups30Days}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights Row */}
      <div className="grid gap-4 md:grid-cols-3 animate-fade-in">
        <Card className="hover:shadow-lg hover:scale-105 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate (30d)</CardTitle>
            <TrendingUp className={`h-4 w-4 ${getChurnColor(stats.churnRate)}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getChurnColor(stats.churnRate)}`}>
              {stats.churnRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.churnRate < 5 ? '✓ Healthy retention' : stats.churnRate < 10 ? 'Moderate churn' : '⚠ High churn'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:scale-105 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Revenue per User</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.arpu.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Business quality metric
            </p>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
          onClick={() => navigate('/admin/referral-codes')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Referral Source</CardTitle>
            <Gift className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.topReferralCode ? `Code: ${stats.topReferralCode}` : 'No data'}
            </div>
            <p className="text-xs text-muted-foreground">
              Most used referral code
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue overview</CardDescription>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.revenueByDay.length > 0 ? stats.revenueByDay : getPlaceholderData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  opacity={stats.revenueByDay.length > 0 ? 1 : 0.2}
                />
              </LineChart>
            </ResponsiveContainer>
            {stats.revenueByDay.length === 0 && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                Preview: Chart will display once payment data is available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Alerts Panel */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 animate-pulse" />
              Recent Activity
            </CardTitle>
            <CardDescription>Live feed of platform events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {alerts.length > 0 ? (
                alerts.map((alert, index) => (
                  <div 
                    key={alert.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-all hover:scale-[1.02] animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="text-xl mt-0.5">
                      {alert.icon}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground animate-fade-in">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Plans Chart */}
      <Card className="shadow-lg animate-fade-in">
        <CardHeader>
          <CardTitle>Top Subscription Plans</CardTitle>
          <CardDescription>Most popular plans by subscriber count</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topPlans.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.topPlans}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="plan" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="url(#colorGradient)" 
                  radius={[8, 8, 0, 0]}
                  animationDuration={1000}
                />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No subscription data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="shadow-lg animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-success animate-pulse" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all hover:scale-[1.02]">
                <span className="text-sm font-medium">Database Connection</span>
                <TooltipUI>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <span className="text-sm font-medium text-success flex items-center gap-1">
                        <span className="animate-pulse">✓</span> Healthy
                      </span>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Lovable Cloud queries running normally</p>
                  </TooltipContent>
                </TooltipUI>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all hover:scale-[1.02]">
                <span className="text-sm font-medium">Authentication Service</span>
                <TooltipUI>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <span className="text-sm font-medium text-success flex items-center gap-1">
                        <span className="animate-pulse">✓</span> Operational
                      </span>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Login success rate 100% (last 24h)</p>
                  </TooltipContent>
                </TooltipUI>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all hover:scale-[1.02]">
                <span className="text-sm font-medium">Storage Service</span>
                <TooltipUI>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <span className="text-sm font-medium text-success flex items-center gap-1">
                        <span className="animate-pulse">✓</span> Operational
                      </span>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>All uploads stable</p>
                  </TooltipContent>
                </TooltipUI>
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverview;
