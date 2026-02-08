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

interface QueueItem {
  id: string;
  user_id: string | null;
  plan: string;
  amount_cents: number;
  currency: string;
  status: string;
  provisioning_status: string;
  created_at: string;
  paid_at: string | null;
  provisioned_at: string | null;
  provisioned_by: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

const ProvisionQueue = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [completedItems, setCompletedItems] = useState<QueueItem[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; item: QueueItem | null }>({ open: false, item: null });
  const [credentialNotes, setCredentialNotes] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard/profile");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadQueue();
    }
  }, [isAdmin]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      // Load pending provision items
      const { data: pending, error: pendingErr } = await supabase
        .from("subscriptions")
        .select("id, user_id, plan, amount_cents, currency, status, provisioning_status, created_at, paid_at, provisioned_at, provisioned_by, profiles(full_name, email)")
        .eq("provisioning_status", "pending_provision")
        .order("created_at", { ascending: true });

      if (pendingErr) throw pendingErr;
      setQueue((pending as unknown as QueueItem[]) || []);

      // Load recently completed items
      const { data: completed, error: completedErr } = await supabase
        .from("subscriptions")
        .select("id, user_id, plan, amount_cents, currency, status, provisioning_status, created_at, paid_at, provisioned_at, provisioned_by, profiles(full_name, email)")
        .eq("provisioning_status", "provisioned")
        .not("provisioned_at", "is", null)
        .order("provisioned_at", { ascending: false })
        .limit(20);

      if (completedErr) throw completedErr;
      setCompletedItems((completed as unknown as QueueItem[]) || []);
    } catch (error) {
      console.error("Error loading provision queue:", error);
      toast({
        title: "Error",
        description: "Failed to load provision queue.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSent = async (item: QueueItem) => {
    setConfirmDialog({ open: true, item });
  };

  const confirmMarkAsSent = async () => {
    const item = confirmDialog.item;
    if (!item) return;

    setMarkingId(item.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("subscriptions")
        .update({
          provisioning_status: "provisioned",
          provisioned_at: new Date().toISOString(),
          provisioned_by: user?.id || null,
        })
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Marked as Sent",
        description: `Credentials for ${item.profiles?.full_name || item.profiles?.email || "customer"} marked as delivered.`,
      });

      setConfirmDialog({ open: false, item: null });
      setCredentialNotes("");
      loadQueue();
    } catch (error) {
      console.error("Error marking as sent:", error);
      toast({
        title: "Error",
        description: "Failed to update provisioning status.",
        variant: "destructive",
      });
    } finally {
      setMarkingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending Payment</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            Manual Provision Queue
          </h1>
          <p className="text-muted-foreground">
            Orders awaiting manual credential delivery
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
            Pending Provisioning
            {queue.length > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ml-2">
                {queue.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            These orders need manual credential creation and delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400/50" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm">No orders pending provisioning.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Amount</TableHead>
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
                        <Badge variant="outline">{item.plan}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        ${(item.amount_cents / 100).toFixed(2)} {item.currency}
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
                Recently Provisioned
              </CardTitle>
              <CardDescription>Last 20 completed provisions</CardDescription>
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
                No completed provisions yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Provisioned At</TableHead>
                      <TableHead>Payment Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedItems.map((item) => (
                      <TableRow key={item.id} className="opacity-70">
                        <TableCell>{item.profiles?.full_name || "—"}</TableCell>
                        <TableCell>{item.profiles?.email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.plan}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.provisioned_at)}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
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
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, item: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Sent</DialogTitle>
            <DialogDescription>
              Confirm that credentials have been delivered to{" "}
              <strong>{confirmDialog.item?.profiles?.full_name || confirmDialog.item?.profiles?.email || "customer"}</strong>
              {" "}for their <strong>{confirmDialog.item?.plan}</strong> plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">Notes (optional)</label>
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

export default ProvisionQueue;
