import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Clock, RefreshCw, DollarSign, Undo2 } from "lucide-react";
import PaymentQueueTable, { type InvoiceItem, type PaymentInfo } from "@/components/admin/PaymentQueueTable";
import PaymentQueueFilters, { type PaymentFilters, applyPaymentFilters } from "@/components/admin/PaymentQueueFilters";
import { getInvoiceStatusBadge } from "@/components/admin/StatusBadges";
import SimulatePaymentButton from "@/components/admin/SimulatePaymentButton";
import PaymentDetailDrawer from "@/components/admin/PaymentDetailDrawer";
import { RefundDialog } from "@/components/admin/RefundDialog";
import { PermissionGuard } from "@/components/admin/PermissionGuard";

const PaymentsQueue = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingInvoices, setPendingInvoices] = useState<InvoiceItem[]>([]);
  const [recentlyPaid, setRecentlyPaid] = useState<InvoiceItem[]>([]);
  const [showPaid, setShowPaid] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [drawerItem, setDrawerItem] = useState<InvoiceItem | null>(null);
  const [filters, setFilters] = useState<PaymentFilters>({
    search: "",
    status: "all",
    plan: "all",
    dateFrom: undefined,
    dateTo: undefined,
  });
  const [refundTarget, setRefundTarget] = useState<InvoiceItem | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/dashboard/profile");
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) loadQueue();
  }, [isAdmin]);

  useEffect(() => {
    const flagged = new Set<string>();
    pendingInvoices.forEach((inv) => {
      if (inv.notes?.includes("[FLAGGED]")) flagged.add(inv.id);
    });
    setFlaggedIds(flagged);
  }, [pendingInvoices]);

  // Derive plan options from data
  const planOptions = useMemo(() => {
    const plans = new Set<string>();
    pendingInvoices.forEach((i) => { if (i.plan_name) plans.add(i.plan_name); });
    return Array.from(plans).sort();
  }, [pendingInvoices]);

  // Filtered results (instant, client-side)
  const filteredInvoices = useMemo(
    () => applyPaymentFilters(pendingInvoices, filters),
    [pendingInvoices, filters]
  );

  const loadQueue = async () => {
    setLoading(true);
    try {
      const { data: unpaid, error: unpaidErr } = await supabase
        .from("invoices")
        .select("id, invoice_number, user_id, plan_name, amount_cents, currency, status, discount_cents, issued_at, notes, created_at")
        .eq("status", "unpaid")
        .order("created_at", { ascending: true });
      if (unpaidErr) throw unpaidErr;

      const { data: paid, error: paidErr } = await supabase
        .from("invoices")
        .select("id, invoice_number, user_id, plan_name, amount_cents, currency, status, discount_cents, issued_at, notes, created_at, paid_at")
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(20);
      if (paidErr) throw paidErr;

      const allInvoiceIds = [...(unpaid || []), ...(paid || [])].map((i) => i.id);
      const paymentsMap: Record<string, PaymentInfo[]> = {};
      if (allInvoiceIds.length > 0) {
        const { data: payments } = await supabase
          .from("payments")
          .select("id, invoice_id, status, provider, processor_payment_id, tx_hash, method, amount_received_cents, from_address, to_address, chain, created_at")
          .in("invoice_id", allInvoiceIds);
        if (payments) {
          payments.forEach((p) => {
            if (!paymentsMap[p.invoice_id]) paymentsMap[p.invoice_id] = [];
            paymentsMap[p.invoice_id].push(p);
          });
        }
      }

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

  const handleMarkPaid = async (invoiceId: string) => {
    const item = pendingInvoices.find((i) => i.id === invoiceId);
    if (!item) return;

    setLoadingAction(invoiceId);
    try {
      const { error: invErr } = await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", invoiceId);
      if (invErr) throw invErr;

      if (item.payments.length > 0) {
        await supabase
          .from("payments")
          .update({ status: "confirmed", received_at: new Date().toISOString() })
          .eq("invoice_id", invoiceId);
      }

      supabase.functions
        .invoke("send-invoice-email", {
          body: { invoice_id: invoiceId, type: "payment_confirmed" },
        })
        .catch((e) => console.error("Email send failed:", e));

      toast({
        title: "Payment Verified",
        description: `Invoice ${item.invoice_number} marked as paid.`,
      });
      loadQueue();
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast({ title: "Error", description: "Failed to verify payment.", variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async (invoiceId: string) => {
    const item = pendingInvoices.find((i) => i.id === invoiceId);
    if (!item) return;

    setLoadingAction(invoiceId);
    try {
      if (item.payments.length > 0) {
        await supabase
          .from("payments")
          .update({ status: "failed" })
          .eq("invoice_id", invoiceId);
      }

      const { error } = await supabase
        .from("invoices")
        .update({
          notes: [item.notes, `[REJECTED at ${new Date().toISOString()}]`].filter(Boolean).join(" "),
        })
        .eq("id", invoiceId);
      if (error) throw error;

      toast({
        title: "Payment Rejected",
        description: `Invoice ${item.invoice_number} payment marked as failed.`,
        variant: "destructive",
      });
      loadQueue();
    } catch (error) {
      console.error("Error rejecting payment:", error);
      toast({ title: "Error", description: "Failed to reject payment.", variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleFlag = async (invoiceId: string) => {
    const item = pendingInvoices.find((i) => i.id === invoiceId);
    if (!item) return;

    const isCurrentlyFlagged = flaggedIds.has(invoiceId);
    setLoadingAction(invoiceId);
    try {
      let newNotes = item.notes || "";
      if (isCurrentlyFlagged) {
        newNotes = newNotes.replace("[FLAGGED]", "").trim();
      } else {
        newNotes = `[FLAGGED] ${newNotes}`.trim();
      }

      const { error } = await supabase
        .from("invoices")
        .update({ notes: newNotes || null })
        .eq("id", invoiceId);
      if (error) throw error;

      setFlaggedIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFlagged) next.delete(invoiceId);
        else next.add(invoiceId);
        return next;
      });

      toast({
        title: isCurrentlyFlagged ? "Flag Removed" : "Flagged for Review",
        description: `Invoice ${item.invoice_number} ${isCurrentlyFlagged ? "unflagged" : "flagged"}.`,
      });
      setPendingInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? { ...inv, notes: newNotes || null } : inv
        )
      );
    } catch (error) {
      console.error("Error flagging invoice:", error);
      toast({ title: "Error", description: "Failed to flag invoice.", variant: "destructive" });
    } finally {
      setLoadingAction(null);
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
            Verify payments and move invoices to fulfillment
          </p>
        </div>
        <Button variant="outline" onClick={loadQueue} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Pending Verification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-yellow-400" />
            Unpaid Invoices
            {pendingInvoices.length > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ml-2">
                {pendingInvoices.length}
              </Badge>
            )}
            {filteredInvoices.length !== pendingInvoices.length && (
              <span className="text-xs text-muted-foreground font-normal ml-1">
                (showing {filteredInvoices.length})
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            ✔ Mark Paid · ❌ Reject · ⚠ Flag for Review
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <PaymentQueueFilters
            filters={filters}
            onFiltersChange={setFilters}
            planOptions={planOptions}
          />
          <PaymentQueueTable
            items={filteredInvoices}
            flaggedIds={flaggedIds}
            loadingAction={loadingAction}
            onMarkPaid={handleMarkPaid}
            onReject={handleReject}
            onFlag={handleFlag}
            onRowClick={setDrawerItem}
            onSimulateSuccess={loadQueue}
          />
        </CardContent>
      </Card>

      {/* Recently Paid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Recently Paid
              </CardTitle>
              <CardDescription className="text-xs">Last 20 verified payments</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowPaid(!showPaid)}>
              {showPaid ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>
        {showPaid && (
          <CardContent className="pt-0">
            {recentlyPaid.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">No paid invoices yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="h-9 px-3">Customer</TableHead>
                      <TableHead className="h-9 px-3">Invoice</TableHead>
                      <TableHead className="h-9 px-3">Plan</TableHead>
                      <TableHead className="h-9 px-3">Amount</TableHead>
                      <TableHead className="h-9 px-3">Status</TableHead>
                      <TableHead className="h-9 px-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentlyPaid.map((item) => (
                      <TableRow key={item.id} className="opacity-70 text-sm">
                        <TableCell className="px-3 py-2">
                          <div>
                            <p className="font-medium text-sm">{item.profiles?.full_name || "—"}</p>
                            <p className="text-[11px] text-muted-foreground">{item.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs px-3 py-2">{item.invoice_number}</TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.plan_name || "—"}</Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2">${(item.amount_cents / 100).toFixed(2)} {item.currency}</TableCell>
                        <TableCell className="px-3 py-2">
                          {getInvoiceStatusBadge("paid")}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right">
                          <PermissionGuard permission="refund_payments">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs gap-1 text-amber-400 hover:text-amber-300"
                              onClick={() => setRefundTarget(item)}
                            >
                              <Undo2 className="h-3 w-3" />
                              Refund
                            </Button>
                          </PermissionGuard>
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

      {/* Payment Detail Drawer */}
      <PaymentDetailDrawer
        open={!!drawerItem}
        onClose={() => setDrawerItem(null)}
        item={drawerItem}
      />

      {/* Refund Dialog */}
      {refundTarget && (
        <RefundDialog
          open={!!refundTarget}
          onClose={() => setRefundTarget(null)}
          invoiceId={refundTarget.id}
          invoiceNumber={refundTarget.invoice_number}
          amountCents={refundTarget.amount_cents}
          currency={refundTarget.currency}
          userId={refundTarget.user_id}
          customerName={refundTarget.profiles?.full_name || null}
          onRefundComplete={loadQueue}
        />
      )}
    </div>
  );
};

export default PaymentsQueue;
