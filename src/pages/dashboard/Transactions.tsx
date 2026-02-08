import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, DollarSign, Clock, FileText, Package } from "lucide-react";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";

interface OrderRecord {
  id: string;
  plan_name: string;
  amount_cents: number;
  currency: string;
  status: string;
  discount_cents: number;
  created_at: string;
  payments: {
    status: string;
    processor: string;
    paid_at: string | null;
  }[];
  invoices: {
    invoice_number: string;
    status: string;
  }[];
}

interface SubscriptionRecord {
  id: string;
  plan: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  ends_at: string | null;
}

const Transactions = () => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch orders with payments & invoices
      const { data: ordersData, error: ordersErr } = await supabase
        .from("orders")
        .select(`
          id, plan_name, amount_cents, currency, status, discount_cents, created_at,
          payments!payments_order_id_fkey(status, processor, paid_at),
          invoices!invoices_order_id_fkey(invoice_number, status)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersErr) throw ordersErr;
      setOrders((ordersData as unknown as OrderRecord[]) || []);

      // Fetch active subscriptions
      const { data: subsData, error: subsErr } = await supabase
        .from("subscriptions")
        .select("id, plan, amount_cents, currency, status, created_at, paid_at, ends_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (subsErr) throw subsErr;
      setSubscriptions(subsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load your payment history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "awaiting_verification":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "pending":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "cancelled":
      case "refunded":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case "awaiting_verification":
        return "Awaiting Verification";
      case "paid":
        return "Paid";
      case "pending":
        return "Pending";
      case "cancelled":
        return "Cancelled";
      case "refunded":
        return "Refunded";
      default:
        return status;
    }
  };

  const getSubStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "expired":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const getDaysRemaining = (endsAt: string | null) => {
    if (!endsAt) return null;
    return differenceInDays(new Date(endsAt), new Date());
  };

  // Find active subscription for renewal date display
  const activeSub = subscriptions.find((s) => s.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment History</h1>
        <p className="text-muted-foreground mt-2">
          View your orders, payments, and subscription details
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Subscription Summary */}
          {activeSub && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <Package className="h-5 w-5" />
                  Active Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Plan</p>
                    <p className="text-xl font-bold">{activeSub.plan}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Next Renewal
                    </p>
                    <p className="text-xl font-bold">
                      {activeSub.ends_at
                        ? format(new Date(activeSub.ends_at), "PPP")
                        : "Lifetime"}
                    </p>
                    {activeSub.ends_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {(() => {
                          const days = getDaysRemaining(activeSub.ends_at);
                          if (days === null) return "";
                          if (days <= 0) return "Expired";
                          return `${days} days remaining`;
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Amount
                    </p>
                    <p className="text-xl font-bold">
                      ${(activeSub.amount_cents / 100).toFixed(2)}{" "}
                      {activeSub.currency}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orders */}
          {orders.length === 0 && subscriptions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 text-6xl">💳</div>
                <h3 className="text-xl font-semibold mb-2">
                  No payments yet
                </h3>
                <p className="text-muted-foreground mb-1">
                  Once you make a purchase, your payment history will appear
                  here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.length > 0 && (
                <h2 className="text-xl font-semibold">Orders</h2>
              )}
              {orders.map((order) => {
                const payment = order.payments?.[0];
                const invoice = order.invoices?.[0];

                return (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-card/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl mb-2">
                            {order.plan_name}
                          </CardTitle>
                          <CardDescription>
                            Ordered on{" "}
                            {format(new Date(order.created_at), "PPP")}
                          </CardDescription>
                        </div>
                        <Badge className={getOrderStatusColor(order.status)}>
                          {getOrderStatusLabel(order.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-3 gap-6">
                        {/* Amount */}
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-accent/10">
                            <DollarSign className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Amount
                            </p>
                            <p className="text-2xl font-bold">
                              ${(order.amount_cents / 100).toFixed(2)}
                            </p>
                            {order.discount_cents > 0 && (
                              <p className="text-xs text-green-400 mt-1">
                                Discount: -$
                                {(order.discount_cents / 100).toFixed(2)}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {order.currency}
                            </p>
                          </div>
                        </div>

                        {/* Payment Status */}
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-accent/10">
                            <Clock className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Payment
                            </p>
                            <p className="text-lg font-semibold capitalize">
                              {payment?.status || "Pending"}
                            </p>
                            {payment?.paid_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Paid{" "}
                                {formatDistanceToNow(
                                  new Date(payment.paid_at),
                                  { addSuffix: true }
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Invoice */}
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-accent/10">
                            <FileText className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Invoice
                            </p>
                            <p className="text-lg font-semibold">
                              {invoice?.invoice_number || "N/A"}
                            </p>
                            {invoice && (
                              <p className="text-xs text-muted-foreground mt-1 capitalize">
                                {invoice.status}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Legacy subscriptions (from old WHMCS flow, if any) */}
              {subscriptions.filter((s) => orders.length === 0).length > 0 &&
                orders.length === 0 && (
                  <>
                    <h2 className="text-xl font-semibold mt-6">
                      Subscriptions
                    </h2>
                    {subscriptions.map((sub) => {
                      const daysRemaining = getDaysRemaining(sub.ends_at);

                      return (
                        <Card key={sub.id} className="overflow-hidden">
                          <CardHeader className="bg-card/50">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-xl mb-2">
                                  {sub.plan} Plan
                                </CardTitle>
                                <CardDescription>
                                  {format(new Date(sub.created_at), "PPP")}
                                </CardDescription>
                              </div>
                              <Badge
                                className={getSubStatusColor(sub.status)}
                              >
                                {sub.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <div className="grid md:grid-cols-3 gap-6">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-accent/10">
                                  <DollarSign className="h-5 w-5 text-accent" />
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">
                                    Amount
                                  </p>
                                  <p className="text-2xl font-bold">
                                    $
                                    {(sub.amount_cents / 100).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-accent/10">
                                  <Calendar className="h-5 w-5 text-accent" />
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">
                                    Expires
                                  </p>
                                  <p className="text-lg font-semibold">
                                    {sub.ends_at
                                      ? format(
                                          new Date(sub.ends_at),
                                          "PPP"
                                        )
                                      : "N/A"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-accent/10">
                                  <Clock className="h-5 w-5 text-accent" />
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">
                                    Days Left
                                  </p>
                                  <p
                                    className={`text-2xl font-bold ${
                                      daysRemaining !== null &&
                                      daysRemaining <= 7
                                        ? "text-red-500"
                                        : daysRemaining !== null &&
                                            daysRemaining <= 30
                                          ? "text-yellow-500"
                                          : "text-green-500"
                                    }`}
                                  >
                                    {daysRemaining !== null
                                      ? Math.max(0, daysRemaining)
                                      : "∞"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </>
                )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Transactions;
