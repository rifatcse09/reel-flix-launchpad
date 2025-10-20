import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, CreditCard, Gift, Smartphone, Clock, Activity, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserDetailsDialogProps {
  userId: string;
  onClose: () => void;
  onUserUpdated: () => void;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  referral_code: string | null;
  created_at: string;
  avatar_url: string | null;
  address: string | null;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  ends_at: string | null;
}

interface UserSession {
  id: string;
  device_type: string;
  browser: string | null;
  os: string | null;
  last_accessed_at: string;
  created_at: string;
}

interface ActivityLog {
  type: string;
  description: string;
  timestamp: string;
}

export function UserDetailsDialog({ userId, onClose, onUserUpdated }: UserDetailsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    loadUserDetails();
  }, [userId]);

  const loadUserDetails = async () => {
    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (subscriptionsError) throw subscriptionsError;
      setSubscriptions(subscriptionsData || []);

      // Load user sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('last_accessed_at', { ascending: false })
        .limit(5);

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Build activity logs from various sources
      const logs: ActivityLog[] = [];
      
      // Add subscription events
      subscriptionsData?.forEach(sub => {
        logs.push({
          type: 'subscription',
          description: `${sub.status === 'active' ? 'Purchased' : 'Created'} ${sub.plan} subscription`,
          timestamp: sub.paid_at || sub.created_at,
        });
      });

      // Add sign-in events from sessions
      sessionsData?.slice(0, 3).forEach(session => {
        logs.push({
          type: 'login',
          description: `Signed in via ${session.device_type} (${session.browser || 'Unknown browser'})`,
          timestamp: session.created_at,
        });
      });

      // Sort by timestamp
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivityLogs(logs.slice(0, 10));
    } catch (error) {
      console.error('Error loading user details:', error);
      toast({
        title: "Error",
        description: "Failed to load user details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !profile) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const totalRevenue = subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((sum, sub) => sum + sub.amount_cents, 0) / 100;

  const activeSubscription = subscriptions.find(sub => 
    sub.status === 'active' && (!sub.ends_at || new Date(sub.ends_at) > new Date())
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </DialogTitle>
          <DialogDescription>
            Detailed information and activity for {profile.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{profile.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-sm">{profile.full_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Referral Code</p>
                  <p className="text-sm">
                    {profile.referral_code ? (
                      <Badge variant="secondary">{profile.referral_code}</Badge>
                    ) : (
                      'Not set'
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Joined</p>
                  <p className="text-sm">{new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p className="text-sm">{profile.address || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-sm font-bold text-primary">${totalRevenue.toFixed(2)}</p>
                </div>
                {activeSubscription && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                      <Badge variant="default" className="mt-1 capitalize">{activeSubscription.plan}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Next Billing</p>
                      <p className="text-sm">
                        {activeSubscription.ends_at 
                          ? new Date(activeSubscription.ends_at).toLocaleDateString() 
                          : 'N/A'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Devices & Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Active Devices ({sessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No active sessions found
                </p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-start justify-between p-3 rounded-lg bg-secondary/30">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {session.device_type}
                          </Badge>
                          {session.browser && (
                            <span className="text-sm text-muted-foreground">{session.browser}</span>
                          )}
                        </div>
                        {session.os && (
                          <p className="text-xs text-muted-foreground">{session.os}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(session.last_accessed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No activity recorded
                </p>
              ) : (
                <div className="space-y-2">
                  {activityLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                      <div className="text-lg mt-0.5">
                        {log.type === 'subscription' ? '💳' : log.type === 'login' ? '👤' : 'ℹ️'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{log.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Subscriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription History ({subscriptions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No subscriptions found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Ends</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="capitalize font-medium">{sub.plan}</TableCell>
                        <TableCell>
                          <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sub.currency} {(sub.amount_cents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {sub.paid_at ? new Date(sub.paid_at).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          {sub.ends_at ? new Date(sub.ends_at).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
