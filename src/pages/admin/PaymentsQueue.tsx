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
import { Loader2, CheckCircle2, Clock, RefreshCw, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface PaymentInfo {
  id: string;
  status: string;
  provider: string | null;
  processor_payment_id: string | null;
  tx_hash: string | null;
  method: string;
}

interface InvoiceItem {
  id: string;
  invoice_number: string;
  user_id: string;
  plan_name: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  discount_cents: number;
  issued_at: string | null;
  notes: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
  payments: PaymentInfo[];
}

const PaymentsQueue = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingInvoices, setPendingInvoices] = useState<InvoiceItem[]>([]);
  const [recentlyPaid, setRecentlyPaid] = useState<InvoiceItem[]>([]);
  const [showPaid, setShowPaid] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; item: InvoiceItem | null }>({
    open: false,
    item: null,
  });
  const [verifyNotes, setVerifyNotes] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/dashboard/profile");
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) loadQueue();
  }, [isAdmin]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      // Unpaid invoices
      const { data: unpaid, error: unpaidErr } = await supabase
        .from("invoices")
        .select("id, invoice_number, user_id, plan_name, amount_cents, currency, status, discount_cents, issued_at, notes, created_at")
        .eq("status", "unpaid")
        .order("created_at", { ascending: true });
      if (unpaidErr) throw unpaidErr;

      // Recently paid
      const { data: paid, error: paidErr } = await supabase
        .from("invoices")
        .select("id, invoice_number, user_id, plan_name, amount_cents, currency, status, discount_cents, issued_at, notes, created_at, paid_at")
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(20);
      if (paidErr) throw paidErr;

      // Fetch payments for all invoices
      const allInvoiceIds = [...(unpaid || []), ...(paid || [])].map((i) => i.id);
      const paymentsMap: Record<string, PaymentInfo[]> = {};
      if (allInvoiceIds.length > 0) {
        const { data: payments } = await supabase
          .from("payments")
          .select("id, invoice_id, status, provider, processor_payment_id, tx_hash, method")
          .in("invoice_id", allInvoiceIds);
        if (payments) {
          payments.forEach((p) => {
            if (!paymentsMap[p.invoice_id]) paymentsMap[p.invoice_id] = [];
            paymentsMap[p.invoice_id].push(p);
          });
        }
      }

      // Fetch profiles
      const allItems = [...(unpaid || []), ...(paid || [])];
      const userIds = [...new Set(allItems.map((i) => i.user_id))];
      let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        if (profiles) {
          profilesMap = Object.fromEntries(
            profiles.map((p) => [p.id, { full_name: p.full_name, email: p.email }])
          );
        }
      }

      const enrich = (item: any): InvoiceItem => ({
        ...item,
        profiles: profilesMap[item.user_id] || null,
        payments: paymentsMap[item.id] || [],
      });

      setPendingInvoices((unpaid || []).map(enrich));
      setRecentlyPaid((paid || []).map(enrich));
    } catch (error) {
      console.error("Error loading payments queue:", error);
      toast({ title: "Error", description: "Failed to load payments queue.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const confirmVerifyPayment = async () => {
    const item = confirmDialog.item;
    if (!item) return;

    setVerifyingId(item.id);
    try {
      // 1. Update invoice to paid
      const { error: invErr } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          notes: verifyNotes || item.notes || null,
        })
        .eq("id", item.id);
      if (invErr) throw invErr;

      // 2. Update payment to confirmed
      if (item.payments.length > 0) {
        await supabase
          .from("payments")
          .update({ status: "confirmed", received_at: new Date().toISOString() })
          .eq("invoice_id", item.id);
      }

      // 3. Send payment confirmed email (fire-and-forget)
      supabase.functions
        .invoke("send-invoice-email", {
          body: { invoice_id: item.id, type: "payment_confirmed" },
        })
        .catch((e) => console.error("Email send failed:", e));

      toast({
        title: "Payment Verified",
        description: `Invoice ${item.invoice_number} marked as paid. Moved to fulfillment queue.`,
      });
      setConfirmDialog({ open: false, item: null });
      setVerifyNotes("");
      loadQueue();
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast({ title: "Error", description: "Failed to verify payment.", variant: "destructive" });
    } finally {
      setVerifyingId(null);
    }
  };

  const getPaymentStatusBadge = (payments: PaymentInfo[]) => {
    if (payments.length === 0) return <Badge variant="secondary">No Payment</Badge>;
    const payment = payments[0];
    switch (payment.status) {
      case "confirmed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
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
            Verify crypto payments and move invoices to fulfillment
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
            Unpaid Invoices
            {pendingInvoices.length > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ml-2">
                {pendingInvoices.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review crypto payments and verify receipt before moving to fulfillment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingInvoices.length === 0 ? (
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
                    <TableHead>Invoice</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Crypto Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvoices.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.profiles?.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{item.profiles?.email || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.invoice_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.plan_name || "—"}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${(item.amount_cents / 100).toFixed(2)} {item.currency}
                        {item.discount_cents > 0 && (
                          <p className="text-xs text-green-400">-${(item.discount_cents / 100).toFixed(2)} discount</p>
                        )}
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(item.payments)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(item.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => setConfirmDialog({ open: true, item })}
                          disabled={verifyingId === item.id}
                          className="gap-1"
                        >
                          {verifyingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Mark Paid
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

      {/* Recently Paid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Recently Paid
              </CardTitle>
              <CardDescription>Last 20 verified payments</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowPaid(!showPaid)}>
              {showPaid ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>
        {showPaid && (
          <CardContent>
            {recentlyPaid.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">No paid invoices yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentlyPaid.map((item) => (
                      <TableRow key={item.id} className="opacity-70">
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.profiles?.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{item.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.invoice_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.plan_name || "—"}</Badge>
                        </TableCell>
                        <TableCell>${(item.amount_cents / 100).toFixed(2)} {item.currency}</TableCell>
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
              Confirm payment for invoice{" "}
              <strong>{confirmDialog.item?.invoice_number}</strong> —{" "}
              <strong>{confirmDialog.item?.profiles?.full_name || confirmDialog.item?.profiles?.email || "customer"}</strong>{" "}
              (${((confirmDialog.item?.amount_cents ?? 0) / 100).toFixed(2)})
            </DialogDescription>
          </DialogHeader>

          {confirmDialog.item?.payments?.[0]?.tx_hash && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="text-muted-foreground">
                TX Hash: <span className="font-mono">{confirmDialog.item.payments[0].tx_hash}</span>
              </p>
            </div>
          )}

          {confirmDialog.item?.payments?.[0]?.processor_payment_id && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="text-muted-foreground">
                NOWPayments ID: <span className="font-mono">{confirmDialog.item.payments[0].processor_payment_id}</span>
              </p>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              placeholder="e.g. Verified on NOWPayments dashboard"
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, item: null })}>
              Cancel
            </Button>
            <Button onClick={confirmVerifyPayment} disabled={verifyingId !== null} className="gap-2">
              {verifyingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsQueue;
