import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateReferralCodeDialogProps {
  onCodeCreated: () => void;
}

export const CreateReferralCodeDialog = ({ onCodeCreated }: CreateReferralCodeDialogProps) => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [label, setLabel] = useState("");
  const [active, setActive] = useState(true);
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [discountAmount, setDiscountAmount] = useState("20");
  const [trialHours, setTrialHours] = useState("24");
  const [discountType, setDiscountType] = useState("both");
  const [planType, setPlanType] = useState("one-year");

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  const resetForm = () => {
    setNewCode("");
    setLabel("");
    setActive(true);
    setMaxUses("");
    setExpiresAt("");
    setDiscountAmount("20");
    setTrialHours("24");
    setDiscountType("both");
    setPlanType("one-year");
  };

  const handleCreate = async () => {
    if (!newCode.trim()) {
      toast({ title: "Error", description: "Please enter a code", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from('referral_codes').insert({
        code: newCode.toUpperCase(),
        label: label || null,
        active,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt || null,
        discount_amount_cents: parseInt(discountAmount) * 100,
        trial_hours: parseInt(trialHours),
        discount_type: discountType,
        plan_type: planType,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Referral code created successfully" });
      resetForm();
      setDialogOpen(false);
      onCodeCreated();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create referral code", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="cta">
          <Plus className="h-4 w-4 mr-2" />
          Create Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Referral Code</DialogTitle>
          <DialogDescription>Generate a new referral code with custom settings</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="uppercase"
              />
              <Button variant="outline" onClick={generateRandomCode}>Generate</Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label (Optional)</Label>
            <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., Summer Promo, Partner Code" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount-type">Benefit Type</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Trial + Discount</SelectItem>
                  <SelectItem value="trial">Trial Only</SelectItem>
                  <SelectItem value="discount">Discount Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trial-hours">Trial Hours</Label>
              <Input id="trial-hours" type="number" value={trialHours} onChange={(e) => setTrialHours(e.target.value)} disabled={discountType === 'discount'} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount-amount">Discount Amount ($)</Label>
            <Input id="discount-amount" type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} disabled={discountType === 'trial'} placeholder="20" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-type">Applies To</Label>
            <Select value={planType} onValueChange={setPlanType}>
              <SelectTrigger id="plan-type"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="one-year">One Year Subscription</SelectItem>
                <SelectItem value="six-months">Six Months Subscription</SelectItem>
                <SelectItem value="one-month">One Month Subscription</SelectItem>
                <SelectItem value="all-plans">All Plans</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Which subscription plan this discount applies to</p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium">Internal Tracking</p>
              <p className="text-xs text-muted-foreground">Managed within ReelFlix — clicks, redemptions, conversions & revenue tracked internally</p>
            </div>
            <Badge variant="secondary">Enabled</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-uses">Max Uses (Optional)</Label>
              <Input id="max-uses" type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires">Expires At (Optional)</Label>
              <Input id="expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="active">Active</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="cta" onClick={handleCreate} disabled={creating}>
            {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
