import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, DollarSign, Clock } from "lucide-react";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";

const Transactions = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (endsAt: string | null) => {
    if (!endsAt) return null;
    const endDate = new Date(endsAt);
    const today = new Date();
    return differenceInDays(endDate, today);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'expired':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground mt-2">View your payment history and subscription details</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </CardContent>
        </Card>
      ) : subscriptions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>All your transactions in one place</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No transactions yet. Your payment history will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((subscription) => {
            const daysRemaining = getDaysRemaining(subscription.ends_at);
            const isActive = subscription.status === 'active';
            
            return (
              <Card key={subscription.id} className="overflow-hidden">
                <CardHeader className="bg-card/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl mb-2">
                        {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan
                      </CardTitle>
                      <CardDescription>
                        Subscribed on {format(new Date(subscription.created_at), 'PPP')}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(subscription.status)}>
                      {subscription.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Amount Paid */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <DollarSign className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
                        <p className="text-2xl font-bold">
                          ${(subscription.amount_cents / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {subscription.currency}
                        </p>
                      </div>
                    </div>

                    {/* Subscription Period */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Calendar className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Subscription Period</p>
                        <p className="text-lg font-semibold">
                          {subscription.ends_at ? format(new Date(subscription.ends_at), 'PPP') : 'N/A'}
                        </p>
                        {subscription.paid_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Paid {formatDistanceToNow(new Date(subscription.paid_at), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Days Remaining */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Clock className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {isActive ? 'Days Remaining' : 'Subscription Status'}
                        </p>
                        {daysRemaining !== null ? (
                          <>
                            <p className={`text-2xl font-bold ${
                              daysRemaining <= 7 ? 'text-red-500' : 
                              daysRemaining <= 30 ? 'text-yellow-500' : 
                              'text-green-500'
                            }`}>
                              {daysRemaining > 0 ? daysRemaining : 0}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {daysRemaining > 0 ? 'days left' : 'expired'}
                            </p>
                          </>
                        ) : (
                          <p className="text-lg font-semibold">No end date</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {subscription.processor_invoice_id && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Invoice ID: {subscription.processor_invoice_id}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Transactions;