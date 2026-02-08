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
import { Loader2, CheckCircle2, Clock, Package, RefreshCw, Send } from "lucide-react";
import { format } from "date-fns";

interface FulfillmentItem {
  id: string;
  order_id: string;
  subscription_id: string | null;
  user_id: string;
  status: string;
  credentials_sent: boolean;
  sent_at: string | null;
  sent_by: string | null;
  notes: string | null;
  created_at: string;
  orders: {
    plan_name: string;
    amount_cents: number;
    currency: string;
  } | null;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

const FulfillmentQueue = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<FulfillmentItem[]>([]);
  const [completedItems, setCompletedItems] = useState<FulfillmentItem[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    item: FulfillmentItem | null;
  }>({ open: false, item: null });
  const [credentialNotes, setCredentialNotes] = useState("");

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
      // Pending fulfillment
      const { data: pending, error: pendingErr } = await supabase
        .from("fulfillment")
        .select(`
          id, order_id, subscription_id, user_id, status, credentials_sent, sent_at, sent_by, notes, created_at,
          orders!fulfillment_order_id_fkey(plan_name, amount_cents, currency),
          profiles!fulfillment_user_id_fkey(full_name, email)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (pendingErr) throw pendingErr;
      setQueue((pending as unknown as FulfillmentItem[]) || []);

      // Recently completed
      const { data: completed, error: completedErr } = await supabase
        .from("fulfillment")
        .select(`
          id, order_id, subscription_id, user_id, status, credentials_sent, sent_at, sent_by, notes, created_at,
          orders!fulfillment_order_id_fkey(plan_name, amount_cents, currency),
          profiles!fulfillment_user_id_fkey(full_name, email)
        `)
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(20);

      if (completedErr) throw completedErr;
      setCompletedItems((completed as unknown as FulfillmentItem[]) || []);
    } catch (error) {
      console.error("Error loading fulfillment queue:", error);
      toast({
        title: "Error",
        description: "Failed to load fulfillment queue.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSent = (item: FulfillmentItem) => {
    setConfirmDialog({ open: true, item });
  };

  const confirmMarkAsSent = async () => {
    const item = confirmDialog.item;
    if (!item) return;

    setMarkingId(item.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Update fulfillment status
      const { error: fulErr } = await supabase
        .from("fulfillment")
        .update({
          status: "sent",
          credentials_sent: true,
          sent_at: new Date().toISOString(),
          sent_by: user?.id || null,
          notes: credentialNotes || null,
        })
        .eq("id", item.id);
      if (fulErr) throw fulErr;

      // 2. Activate the subscription linked to this order
      // Find subscription by user + plan match (pending status)
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", item.user_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);

      if (subs && subs.length > 0) {
        const { error: subErr } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            paid_at: new Date().toISOString(),
            provisioning_status: "provisioned",
            provisioned_at: new Date().toISOString(),
            provisioned_by: user?.id || null,
          })
          .eq("id", subs[0].id);

        if (subErr) console.error("Failed to activate subscription:", subErr);

        // Link subscription to fulfillment
        await supabase
          .from("fulfillment")
          .update({ subscription_id: subs[0].id })
          .eq("id", item.id);
      }

      toast({
        title: "Marked as Sent",
        description: `Credentials for ${item.profiles?.full_name || item.profiles?.email || "customer"} marked as delivered. Subscription activated.`,
      });

      setConfirmDialog({ open: false, item: null });
      setCredentialNotes("");
      loadQueue();
    } catch (error) {
      console.error("Error marking as sent:", error);
      toast({
        title: "Error",
        description: "Failed to update fulfillment status.",
        variant: "destructive",
      });
    } finally {
      setMarkingId(null);
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
            <Package className="h-8 w-8 text-primary" />
            Fulfillment Queue
          </h1>
          <p className="text-muted-foreground">
            Paid orders awaiting manual credential delivery
          </p>
        </div>
        <Button variant="outline" onClick={loadQueue} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Pending Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-400" />
            Pending Fulfillment
            {queue.length > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ml-2">
                {queue.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            These orders are paid and awaiting credential delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400/50" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm">No orders pending fulfillment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid On</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.profiles?.full_name || "—"}
                      </TableCell>
                      <TableCell>{item.profiles?.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.orders?.plan_name || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        ${((item.orders?.amount_cents ?? 0) / 100).toFixed(2)}{" "}
                        {item.orders?.currency || "USD"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(item.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsSent(item)}
                          disabled={markingId === item.id}
                          className="gap-1"
                        >
                          {markingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Mark as Sent
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

      {/* Recently Completed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Recently Fulfilled
              </CardTitle>
              <CardDescription>Last 20 delivered credentials</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              {showCompleted ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>
        {showCompleted && (
          <CardContent>
            {completedItems.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">
                No fulfilled orders yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedItems.map((item) => (
                      <TableRow key={item.id} className="opacity-70">
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.profiles?.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{item.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.orders?.plan_name || "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.sent_at
                            ? format(new Date(item.sent_at), "MMM d, yyyy HH:mm")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {item.notes || "—"}
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

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ open: false, item: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Sent</DialogTitle>
            <DialogDescription>
              Confirm that credentials have been delivered to{" "}
              <strong>
                {confirmDialog.item?.profiles?.full_name ||
                  confirmDialog.item?.profiles?.email ||
                  "customer"}
              </strong>{" "}
              for their{" "}
              <strong>{confirmDialog.item?.orders?.plan_name}</strong> plan.
              This will also activate their subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Credentials / Notes (optional)
            </label>
            <Textarea
              placeholder="e.g. Credentials sent via email, username: user123"
              value={credentialNotes}
              onChange={(e) => setCredentialNotes(e.target.value)}
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
              onClick={confirmMarkAsSent}
              disabled={markingId !== null}
              className="gap-2"
            >
              {markingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirm Sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FulfillmentQueue;
