import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Undo2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RefundDialogProps {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  amountCents: number;
  currency: string;
  userId: string;
  customerName: string | null;
  onRefundComplete: () => void;
}

export function RefundDialog({
  open,
  onClose,
  invoiceId,
  invoiceNumber,
  amountCents,
  currency,
  userId,
  customerName,
  onRefundComplete,
}: RefundDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [refundAmountDollars, setRefundAmountDollars] = useState((amountCents / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [createCredit, setCreateCredit] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  const refundCents = Math.round(parseFloat(refundAmountDollars) * 100);
  const isPartial = refundCents < amountCents;
  const isValid = refundCents > 0 && refundCents <= amountCents && reason.trim().length > 0;

  const handleRefund = async () => {
    if (!isValid || !confirmed) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id;

      // 1. Mark invoice as refunded
      const { error: invErr } = await supabase
        .from("invoices")
        .update({
          status: "refunded",
          refunded_at: new Date().toISOString(),
          refunded_by: adminId,
          refund_amount_cents: refundCents,
          notes: `[REFUNDED] ${reason}`,
        })
        .eq("id", invoiceId);
      if (invErr) throw invErr;

      // 2. Create account credit if requested
      if (createCredit) {
        const { error: creditErr } = await supabase
          .from("account_credits")
          .insert({
            user_id: userId,
            amount_cents: refundCents,
            reason: `Refund for invoice ${invoiceNumber}: ${reason}`,
            source_type: "refund",
            source_id: invoiceId,
            created_by: adminId,
          });
        if (creditErr) throw creditErr;
      }

      toast({
        title: "Refund Processed",
        description: `${currency} ${(refundCents / 100).toFixed(2)} refunded for ${invoiceNumber}${createCredit ? " — credit added to account" : ""}`,
      });

      onRefundComplete();
      onClose();
    } catch (error: any) {
      console.error("Refund error:", error);
      toast({
        title: "Refund Failed",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Process Refund
          </DialogTitle>
          <DialogDescription>
            Refund invoice <strong>{invoiceNumber}</strong> for{" "}
            <strong>{customerName || "customer"}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-400">
              This will change the invoice status to &quot;refunded&quot;. This action cannot be undone.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Original Amount</Label>
            <p className="text-lg font-bold">{currency} {(amountCents / 100).toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-amount">Refund Amount ({currency})</Label>
            <Input
              id="refund-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={(amountCents / 100).toFixed(2)}
              value={refundAmountDollars}
              onChange={(e) => setRefundAmountDollars(e.target.value)}
            />
            {isPartial && (
              <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">
                Partial refund
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (required)</Label>
            <Textarea
              id="reason"
              placeholder="e.g. Customer requested refund, duplicate charge..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={createCredit}
              onChange={(e) => setCreateCredit(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Create account credit for this amount</span>
          </label>

          {!confirmed ? (
            <Button
              variant="outline"
              className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={() => setConfirmed(true)}
              disabled={!isValid}
            >
              I understand — proceed to confirm
            </Button>
          ) : (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
              <p className="text-xs text-red-400 mb-2">
                Confirm: Refund {currency} {(refundCents / 100).toFixed(2)} for {invoiceNumber}?
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleRefund}
            disabled={!isValid || !confirmed || loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirm Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
