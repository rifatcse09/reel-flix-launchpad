import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CommissionManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referrerId: string;
  referrerName: string;
  currentRate?: number;
  onSuccess: () => void;
}

export const CommissionManagementDialog = ({
  open,
  onOpenChange,
  referrerId,
  referrerName,
  currentRate = 10,
  onSuccess
}: CommissionManagementDialogProps) => {
  const [commissionRate, setCommissionRate] = useState(currentRate.toString());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setLoading(true);
    try {
      const rate = parseFloat(commissionRate);
      
      if (isNaN(rate) || rate < 0 || rate > 100) {
        toast({
          title: "Invalid Rate",
          description: "Commission rate must be between 0 and 100",
          variant: "destructive"
        });
        return;
      }

      // Check if commission record exists
      const { data: existing } = await supabase
        .from('referrer_commissions')
        .select('id')
        .eq('referrer_id', referrerId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('referrer_commissions')
          .update({
            commission_rate: rate,
            notes: notes || null
          })
          .eq('referrer_id', referrerId);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('referrer_commissions')
          .insert({
            referrer_id: referrerId,
            commission_rate: rate,
            notes: notes || null
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Commission rate set to ${rate}% for ${referrerName}`
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving commission:', error);
      toast({
        title: "Error",
        description: "Failed to save commission settings",
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
          <DialogTitle>Set Commission for {referrerName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rate">Commission Rate (%)</Label>
            <Input
              id="rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              placeholder="10.00"
            />
            <p className="text-xs text-muted-foreground">
              Percentage of revenue this referrer will earn
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this commission agreement..."
              rows={3}
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
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Commission
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
