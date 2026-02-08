import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreditDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  customerName: string | null;
  customerEmail: string | null;
  onCreditCreated: () => void;
}

export function CreditDialog({
  open,
  onClose,
  userId,
  customerName,
  customerEmail,
  onCreditCreated,
}: CreditDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amountDollars, setAmountDollars] = useState("");
  const [reason, setReason] = useState("");
  const [sourceType, setSourceType] = useState("manual");

  const amountCents = Math.round(parseFloat(amountDollars || "0") * 100);
  const isValid = amountCents > 0 && reason.trim().length > 0;

  const handleCreate = async () => {
    if (!isValid) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("account_credits")
        .insert({
          user_id: userId,
          amount_cents: amountCents,
          reason,
          source_type: sourceType,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Credit Created",
        description: `$${(amountCents / 100).toFixed(2)} credit added for ${customerName || customerEmail}`,
      });

      onCreditCreated();
      onClose();
      setAmountDollars("");
      setReason("");
    } catch (error: any) {
      console.error("Credit error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create credit",
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
            <Plus className="h-5 w-5" />
            Add Account Credit
          </DialogTitle>
          <DialogDescription>
            Add credit for <strong>{customerName || customerEmail || "customer"}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="credit-amount">Amount (USD)</Label>
            <Input
              id="credit-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Credit Type</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Adjustment</SelectItem>
                <SelectItem value="promotional">Promotional</SelectItem>
                <SelectItem value="goodwill">Goodwill</SelectItem>
                <SelectItem value="refund">Refund Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credit-reason">Reason (required)</Label>
            <Textarea
              id="credit-reason"
              placeholder="e.g. Compensation for service downtime..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!isValid || loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
