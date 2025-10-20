import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, DollarSign, TrendingUp, Gift, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface ReferralStats {
  totalReferrals: number;
  totalRevenue: number;
  activeReferrals: number;
  referralCode: string;
  recentReferrals: Array<{
    created_at: string;
    note: string | null;
  }>;
}

const ReferralRewards = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalRevenue: 0,
    activeReferrals: 0,
    referralCode: "",
    recentReferrals: []
  });

  useEffect(() => {
    loadReferralStats();
  }, []);

  const loadReferralStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();

      if (!profile?.referral_code) {
        setLoading(false);
        return;
      }

      // Get the referral code record
      const { data: codeData } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('code', profile.referral_code)
        .maybeSingle();

      if (!codeData) {
        setStats(prev => ({ ...prev, referralCode: profile.referral_code }));
        setLoading(false);
        return;
      }

      // Get referral uses
      const { data: uses } = await supabase
        .from('referral_uses')
        .select('created_at, note')
        .eq('code_id', codeData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get subscriptions that used this referral code
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('amount_cents, status')
        .eq('referral_code_id', codeData.id);

      const totalRevenue = subscriptions?.reduce((sum, sub) => sum + (sub.amount_cents || 0), 0) || 0;
      const activeReferrals = subscriptions?.filter(sub => sub.status === 'active').length || 0;

      setStats({
        totalReferrals: uses?.length || 0,
        totalRevenue: totalRevenue / 100, // Convert to dollars
        activeReferrals,
        referralCode: profile.referral_code,
        recentReferrals: uses || []
      });
    } catch (error) {
      console.error('Error loading referral stats:', error);
      toast({
        title: "Error",
        description: "Failed to load referral statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(stats.referralCode);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard"
    });
  };

  const shareReferralLink = () => {
    const url = `${window.location.origin}?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied!",
      description: "Share this link to earn rewards"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Referral Rewards</h1>
        <p className="text-muted-foreground">Track your referrals and rewards earned</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              People who used your code
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeReferrals}</div>
            <p className="text-xs text-muted-foreground">
              Currently active referrals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Generated from referrals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalReferrals > 0 
                ? ((stats.activeReferrals / stats.totalReferrals) * 100).toFixed(0)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Referrals to subscribers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-3xl font-bold font-mono text-accent bg-secondary px-4 py-3 rounded-lg border border-border">
                {stats.referralCode || "No code generated"}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={copyReferralCode}
              disabled={!stats.referralCode}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="cta"
              className="flex-1"
              onClick={shareReferralLink}
              disabled={!stats.referralCode}
            >
              Share Referral Link
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Share your referral code or link with friends and family. When they sign up and subscribe, you'll earn rewards!
          </p>
        </CardContent>
      </Card>

      {/* Recent Referrals */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentReferrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No referrals yet</p>
              <p className="text-sm mt-2">Share your code to start earning rewards!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentReferrals.map((referral, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-secondary rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium">New Referral</p>
                      <p className="text-xs text-muted-foreground">
                        {referral.note || "Used your referral code"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rewards Info */}
      <Card>
        <CardHeader>
          <CardTitle>How Referral Rewards Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-accent font-bold">1</span>
            </div>
            <div>
              <p className="font-medium text-foreground">Share Your Code</p>
              <p>Send your unique referral code or link to friends and family</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-accent font-bold">2</span>
            </div>
            <div>
              <p className="font-medium text-foreground">They Subscribe</p>
              <p>When they sign up using your code and purchase a subscription</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-accent font-bold">3</span>
            </div>
            <div>
              <p className="font-medium text-foreground">Earn Rewards</p>
              <p>You receive rewards for each successful referral</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralRewards;
