import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Clock, RefreshCw, DollarSign, AlertCircle, Eye } from "lucide-react";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  user_id: string;
  plan_name: string;
  amount_cents: number;
  currency: string;
  status: string;
  discount_cents: number;
  created_at: string;
  notes: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
  payments: {
    id: string;
    status: string;
    processor_payment_id: string | null;
    paid_at: string | null;
  }[] | null;
  invoices: {
    invoice_number: string;
    status: string;
  }[] | null;
}

const PaymentsQueue = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<OrderItem[]>([]);
  const [recentlyVerified, setRecentlyVerified] = useState<OrderItem[]>([]);
  const [showVerified, setShowVerified] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; item: OrderItem | null }>({
    open: false,
    item: null,
  });
  const [verifyNotes, setVerifyNotes] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard/profile");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) loadQueue();
  }, [isAdmin]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      // Load awaiting verification orders
      const { data: pending, error: pendingErr } = await supabase
        .from("orders")
        .select(`
          id, user_id, plan_name, amount_cents, currency, status, discount_cents, created_at, notes,
          payments!payments_order_id_fkey(id, status, processor_payment_id, paid_at),
          invoices!invoices_order_id_fkey(invoice_number, status)
        `)
        .eq("status", "awaiting_verification")
        .order("created_at", { ascending: true });

      if (pendingErr) throw pendingErr;

      // Load recently verified
      const { data: verified, error: verifiedErr } = await supabase
        .from("orders")
        .select(`
          id, user_id, plan_name, amount_cents, currency, status, discount_cents, created_at, notes,
          payments!payments_order_id_fkey(id, status, processor_payment_id, paid_at),
          invoices!invoices_order_id_fkey(invoice_number, status)
        `)
        .eq("status", "paid")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (verifiedErr) throw verifiedErr;

      // Fetch profiles separately for all unique user_ids
      const allItems = [...(pending || []), ...(verified || [])];
      const userIds = [...new Set(allItems.map((item) => item.user_id))];

      let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map((p) => [p.id, { full_name: p.full_name, email: p.email }]));
        }
      }

      const enrichItem = (item: any): OrderItem => ({
        ...item,
        profiles: profilesMap[item.user_id] || null,
      });

      setPendingOrders((pending || []).map(enrichItem));
      setRecentlyVerified((verified || []).map(enrichItem));
    } catch (error) {
      console.error("Error loading payments queue:", error);
      toast({
        title: "Error",
        description: "Failed to load payments queue.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = (item: OrderItem) => {
    setConfirmDialog({ open: true, item });
  };

  const confirmVerifyPayment = async () => {
    const item = confirmDialog.item;
    if (!item) return;

    setVerifyingId(item.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Update order status to paid
      const { error: orderErr } = await supabase
        .from("orders")
        .update({
          status: "paid",
          notes: verifyNotes || null,
        })
        .eq("id", item.id);
      if (orderErr) throw orderErr;

      // 2. Update payment status to confirmed
      if (item.payments && item.payments.length > 0) {
        const { error: payErr } = await supabase
          .from("payments")
          .update({
            status: "confirmed",
            paid_at: new Date().toISOString(),
          })
          .eq("order_id", item.id);
        if (payErr) console.error("Failed to update payment:", payErr);
      }

      // 3. Update invoice status to paid
      if (item.invoices && item.invoices.length > 0) {
        const { error: invErr } = await supabase
          .from("invoices")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("order_id", item.id);
        if (invErr) console.error("Failed to update invoice:", invErr);
      }

      // 4. Create fulfillment record
      const { error: fulErr } = await supabase.from("fulfillment").insert({
        order_id: item.id,
        user_id: item.user_id,
        status: "pending",
        credentials_sent: false,
      });
      if (fulErr) console.error("Failed to create fulfillment:", fulErr);

      toast({
        title: "Payment Verified",
        description: `Payment for ${item.profiles?.full_name || item.profiles?.email || "customer"} has been verified. Order moved to fulfillment queue.`,
      });

      setConfirmDialog({ open: false, item: null });
      setVerifyNotes("");
      loadQueue();
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast({
        title: "Error",
        description: "Failed to verify payment.",
        variant: "destructive",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const getPaymentStatusBadge = (payments: OrderItem["payments"]) => {
    if (!payments || payments.length === 0) {
      return <Badge variant="secondary">No Payment</Badge>;
    }
    const payment = payments[0];
    switch (payment.status) {
      case "confirmed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmed</Badge>;
      case "confirming":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Confirming</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case "failed":
      case "expired":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{payment.status}</Badge>;
      default:
        return <Badge variant="secondary">{payment.status}</Badge>;
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-primary" />
            Payments Queue
          </h1>
          <p className="text-muted-foreground">
            Verify crypto payments and move orders to fulfillment
          </p>
        </div>
        <Button variant="outline" onClick={loadQueue} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Pending Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-400" />
            Awaiting Payment Verification
            {pendingOrders.length > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ml-2">
                {pendingOrders.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review crypto payments and verify receipt before moving to fulfillment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400/50" />
              <p className="text-lg font-medium">No payments to verify</p>
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Crypto Status</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.profiles?.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{item.profiles?.email || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.plan_name}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${(item.amount_cents / 100).toFixed(2)} {item.currency}
                        {item.discount_cents > 0 && (
                          <p className="text-xs text-green-400">-${(item.discount_cents / 100).toFixed(2)} discount</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.invoices?.[0]?.invoice_number || "—"}
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(item.payments)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(item.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleVerifyPayment(item)}
                          disabled={verifyingId === item.id}
                          className="gap-1"
                        >
                          {verifyingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Verify Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Verified */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Recently Verified
              </CardTitle>
              <CardDescription>Last 20 verified payments</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowVerified(!showVerified)}>
              {showVerified ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>
        {showVerified && (
          <CardContent>
            {recentlyVerified.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">
                No verified payments yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Verified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentlyVerified.map((item) => (
                      <TableRow key={item.id} className="opacity-70">
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.profiles?.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{item.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.plan_name}</Badge>
                        </TableCell>
                        <TableCell>
                          ${(item.amount_cents / 100).toFixed(2)} {item.currency}
                        </TableCell>
                        <TableCell>{item.invoices?.[0]?.invoice_number || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {item.payments?.[0]?.paid_at
                            ? format(new Date(item.payments[0].paid_at), "MMM d, yyyy HH:mm")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Verify Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, item: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Payment</DialogTitle>
            <DialogDescription>
              Confirm that you have verified the crypto payment for{" "}
              <strong>
                {confirmDialog.item?.profiles?.full_name ||
                  confirmDialog.item?.profiles?.email ||
                  "customer"}
              </strong>{" "}
              — <strong>{confirmDialog.item?.plan_name}</strong> plan (
              ${((confirmDialog.item?.amount_cents ?? 0) / 100).toFixed(2)}).
            </DialogDescription>
          </DialogHeader>

          {confirmDialog.item?.payments?.[0]?.processor_payment_id && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="text-muted-foreground">
                NOWPayments ID:{" "}
                <span className="font-mono">
                  {confirmDialog.item.payments[0].processor_payment_id}
                </span>
              </p>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              placeholder="e.g. Verified on NOWPayments dashboard, tx hash: ..."
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, item: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmVerifyPayment}
              disabled={verifyingId !== null}
              className="gap-2"
            >
              {verifyingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirm Verified
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsQueue;
