import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, MousePointerClick, DollarSign, Code, Calendar } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";

interface ReferrerPortfolioDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName: string;
}

interface ReferralCodeData {
  id: string;
  code: string;
  label: string | null;
  active: boolean;
  clicks: number;
  uses: number;
  revenue: number;
  created_at: string;
}

interface TimeSeriesData {
  date: string;
  revenue: number;
  clicks: number;
  uses: number;
}

interface RecentSubscription {
  id: string;
  user_email: string;
  amount_cents: number;
  created_at: string;
  code: string;
}

export const ReferrerPortfolioDrawer = ({ 
  open, 
  onOpenChange, 
  creatorId, 
  creatorName 
}: ReferrerPortfolioDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<ReferralCodeData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [recentSubs, setRecentSubs] = useState<RecentSubscription[]>([]);

  useEffect(() => {
    if (open && creatorId) {
      loadPortfolioData();
    }
  }, [open, creatorId]);

  const loadPortfolioData = async () => {
    setLoading(true);
    try {
      // Get referrer's codes
      const { data: codesData, error: codesError } = await supabase
        .from('referral_codes')
        .select('id, code, label, active, created_at')
        .eq('created_by', creatorId);

      if (codesError) throw codesError;

      const codeIds = codesData?.map(c => c.id) || [];

      // Get clicks per code
      const { data: clicksData } = await supabase
        .from('referral_clicks')
        .select('code_id, clicked_at')
        .in('code_id', codeIds);

      // Get uses per code
      const { data: usesData } = await supabase
        .from('referral_uses')
        .select('code_id, created_at')
        .in('code_id', codeIds);

      // Get revenue per code
      const { data: subsData } = await supabase
        .from('subscriptions')
        .select('referral_code_id, amount_cents, created_at, user_id')
        .in('referral_code_id', codeIds)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      // Get user emails for recent subs
      const userIds = subsData?.map(s => s.user_id).filter(Boolean) || [];
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      // Aggregate code-level stats
      const enrichedCodes: ReferralCodeData[] = (codesData || []).map(code => {
        const codeClicks = clicksData?.filter(c => c.code_id === code.id) || [];
        const codeUses = usesData?.filter(u => u.code_id === code.id) || [];
        const codeSubs = subsData?.filter(s => s.referral_code_id === code.id) || [];
        const codeRevenue = codeSubs.reduce((sum, s) => sum + (s.amount_cents || 0), 0) / 100;

        return {
          id: code.id,
          code: code.code,
          label: code.label,
          active: code.active,
          clicks: codeClicks.length,
          uses: codeUses.length,
          revenue: codeRevenue,
          created_at: code.created_at
        };
      }).sort((a, b) => b.revenue - a.revenue);

      setCodes(enrichedCodes);

      // Build time series (last 30 days)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return format(date, 'yyyy-MM-dd');
      });

      const timeSeries: TimeSeriesData[] = last30Days.map(date => {
        const dayClicks = clicksData?.filter(c => 
          format(new Date(c.clicked_at), 'yyyy-MM-dd') === date
        ).length || 0;
        
        const dayUses = usesData?.filter(u => 
          format(new Date(u.created_at), 'yyyy-MM-dd') === date
        ).length || 0;
        
        const dayRevenue = subsData
          ?.filter(s => format(new Date(s.created_at), 'yyyy-MM-dd') === date)
          .reduce((sum, s) => sum + (s.amount_cents || 0), 0) / 100 || 0;

        return {
          date: format(new Date(date), 'MMM dd'),
          revenue: dayRevenue,
          clicks: dayClicks,
          uses: dayUses
        };
      });

      setTimeSeriesData(timeSeries);

      // Recent subscriptions
      const recent: RecentSubscription[] = (subsData || []).slice(0, 10).map(sub => {
        const userEmail = usersData?.find(u => u.id === sub.user_id)?.email || 'Unknown';
        const code = codesData?.find(c => c.id === sub.referral_code_id)?.code || '';
        return {
          id: sub.referral_code_id,
          user_email: userEmail,
          amount_cents: sub.amount_cents || 0,
          created_at: sub.created_at,
          code
        };
      });

      setRecentSubs(recent);

    } catch (error) {
      console.error('Error loading portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = codes.reduce((sum, c) => sum + c.revenue, 0);
  const totalClicks = codes.reduce((sum, c) => sum + c.clicks, 0);
  const totalUses = codes.reduce((sum, c) => sum + c.uses, 0);
  const conversionRate = totalClicks > 0 ? (totalUses / totalClicks) * 100 : 0;

  const activeCodesCount = codes.filter(c => c.active).length;
  const topCode = codes[0];

  // Pie chart data for code distribution
  const pieData = codes.slice(0, 5).map((code, index) => ({
    name: code.label || code.code,
    value: code.revenue,
    color: `hsl(${330 - index * 30}, 70%, ${60 - index * 5}%)`
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">{creatorName}'s Portfolio</SheetTitle>
          <p className="text-sm text-muted-foreground">Detailed performance metrics and insights</p>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${totalRevenue.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Code className="h-4 w-4 text-blue-500" />
                    Codes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{codes.length}</div>
                  <p className="text-xs text-muted-foreground">{activeCodesCount} active</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4 text-purple-500" />
                    Clicks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalClicks}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    Conv. Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="codes">Codes</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Code</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topCode ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-lg font-bold">{topCode.code}</span>
                          <Badge variant={topCode.active ? "default" : "secondary"}>
                            {topCode.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {topCode.label && (
                          <p className="text-sm text-muted-foreground">{topCode.label}</p>
                        )}
                        <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                          <div>
                            <div className="text-xs text-muted-foreground">Revenue</div>
                            <div className="text-lg font-bold text-green-600">${topCode.revenue.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Clicks</div>
                            <div className="text-lg font-bold">{topCode.clicks}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Uses</div>
                            <div className="text-lg font-bold">{topCode.uses}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No codes yet</p>
                    )}
                  </CardContent>
                </Card>

                {pieData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Distribution (Top 5 Codes)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => `$${value.toFixed(2)}`}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Codes Tab */}
              <TabsContent value="codes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>All Referral Codes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Clicks</TableHead>
                          <TableHead>Uses</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {codes.map(code => (
                          <TableRow key={code.id}>
                            <TableCell>
                              <div className="font-mono font-medium">{code.code}</div>
                              {code.label && (
                                <div className="text-xs text-muted-foreground">{code.label}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={code.active ? "default" : "secondary"}>
                                {code.active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>{code.clicks}</TableCell>
                            <TableCell>{code.uses}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              ${code.revenue.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                          formatter={(value: any) => `$${value.toFixed(2)}`}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="hsl(142 76% 36%)" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(142 76% 36%)' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Trend (Last 30 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="clicks" fill="hsl(330 100% 55%)" name="Clicks" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="uses" fill="hsl(4 100% 63%)" name="Uses" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Subscriptions</CardTitle>
                    <p className="text-sm text-muted-foreground">Last 10 paid subscriptions</p>
                  </CardHeader>
                  <CardContent>
                    {recentSubs.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No subscriptions yet</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentSubs.map((sub, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  {format(new Date(sub.created_at), 'MMM dd, yyyy')}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{sub.user_email}</TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">{sub.code}</code>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${(sub.amount_cents / 100).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
