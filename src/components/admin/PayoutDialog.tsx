import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign } from "lucide-react";

interface PayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referrerId: string;
  referrerName: string;
  pendingAmount: number;
  onSuccess: () => void;
}

export const PayoutDialog = ({
  open,
  onOpenChange,
  referrerId,
  referrerName,
  pendingAmount,
  onSuccess
}: PayoutDialogProps) => {
  const [amount, setAmount] = useState((pendingAmount / 100).toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreatePayout = async () => {
    setLoading(true);
    try {
      const amountCents = Math.round(parseFloat(amount) * 100);
      
      if (isNaN(amountCents) || amountCents <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid payout amount",
          variant: "destructive"
        });
        return;
      }

      if (amountCents > pendingAmount) {
        toast({
          title: "Amount Too Large",
          description: `Cannot payout more than pending amount ($${(pendingAmount / 100).toFixed(2)})`,
          variant: "destructive"
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('payout_logs')
        .insert({
          referrer_id: referrerId,
          amount_cents: amountCents,
          status: 'pending',
          payment_method: paymentMethod,
          payment_reference: paymentReference || null,
          notes: notes || null,
          processed_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Payout Created",
        description: `Pending payout of $${(amountCents / 100).toFixed(2)} created for ${referrerName}`
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating payout:', error);
      toast({
        title: "Error",
        description: "Failed to create payout",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Payout for {referrerName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Pending Balance</div>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {(pendingAmount / 100).toFixed(2)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Payout Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Payment Reference (Optional)</Label>
            <Input
              id="reference"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Transaction ID, check number, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this payout..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleCreatePayout} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Payout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
