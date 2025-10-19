import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface ReferralCode {
  id: string;
  code: string;
  active: boolean;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  label: string | null;
  discount_amount_cents: number;
  trial_hours: number;
  discount_type: string;
  use_count?: number;
}

const AdminReferralCodes = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [newCode, setNewCode] = useState("");
  const [label, setLabel] = useState("");
  const [active, setActive] = useState(true);
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [discountAmount, setDiscountAmount] = useState("20");
  const [trialHours, setTrialHours] = useState("24");
  const [discountType, setDiscountType] = useState("both");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadReferralCodes();
    }
  }, [isAdmin]);

  const loadReferralCodes = async () => {
    try {
      const { data: codes, error } = await supabase
        .from('referral_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get use counts for each code
      const { data: uses } = await supabase
        .from('referral_uses')
        .select('code_id');

      const codesWithCounts = codes?.map(code => ({
        ...code,
        use_count: uses?.filter(use => use.code_id === code.id).length || 0
      })) || [];

      setReferralCodes(codesWithCounts);
    } catch (error) {
      console.error('Error loading referral codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  const handleCreateCode = async () => {
    if (!newCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a code",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const codeData: any = {
        code: newCode.toUpperCase(),
        label: label || null,
        active,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt || null,
        discount_amount_cents: parseInt(discountAmount) * 100,
        trial_hours: parseInt(trialHours),
        discount_type: discountType,
      };

      const { error } = await supabase
        .from('referral_codes')
        .insert(codeData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Referral code created successfully"
      });

      // Reset form
      setNewCode("");
      setLabel("");
      setActive(true);
      setMaxUses("");
      setExpiresAt("");
      setDiscountAmount("20");
      setTrialHours("24");
      setDiscountType("both");
      setDialogOpen(false);

      // Reload codes
      await loadReferralCodes();
    } catch (error: any) {
      console.error('Error creating code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create referral code",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Referral Codes Management</h1>
          <p className="text-muted-foreground">View and manage all referral codes</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Referral Code</DialogTitle>
              <DialogDescription>
                Generate a new referral code with custom settings
              </DialogDescription>
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
                  <Button variant="outline" onClick={generateRandomCode}>
                    Generate
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Label (Optional)</Label>
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., Summer Promo, Partner Code"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount-type">Benefit Type</Label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Trial + Discount</SelectItem>
                      <SelectItem value="trial">Trial Only</SelectItem>
                      <SelectItem value="discount">Discount Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trial-hours">Trial Hours</Label>
                  <Input
                    id="trial-hours"
                    type="number"
                    value={trialHours}
                    onChange={(e) => setTrialHours(e.target.value)}
                    disabled={discountType === 'discount'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount-amount">Discount Amount ($)</Label>
                <Input
                  id="discount-amount"
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  disabled={discountType === 'trial'}
                  placeholder="20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-uses">Max Uses (Optional)</Label>
                  <Input
                    id="max-uses"
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Unlimited"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires">Expires At (Optional)</Label>
                  <Input
                    id="expires"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={active}
                  onCheckedChange={setActive}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCode} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Code"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Referral Codes ({referralCodes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Benefits</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Max Uses</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referralCodes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono font-bold">{code.code}</TableCell>
                  <TableCell>{code.label || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={code.active ? 'default' : 'destructive'}>
                      {code.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {(code.discount_type === 'trial' || code.discount_type === 'both') && (
                        <Badge variant="secondary" className="text-xs">
                          {code.trial_hours}h Free Trial
                        </Badge>
                      )}
                      {(code.discount_type === 'discount' || code.discount_type === 'both') && (
                        <Badge variant="secondary" className="text-xs">
                          ${(code.discount_amount_cents / 100).toFixed(2)} Off
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{code.use_count}</TableCell>
                  <TableCell>{code.max_uses || 'Unlimited'}</TableCell>
                  <TableCell>
                    {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>{new Date(code.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReferralCodes;
