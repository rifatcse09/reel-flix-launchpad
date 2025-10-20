import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, Plus, RefreshCw, Eye, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ReferralCode {
  code_id: string;
  code: string;
  label: string | null;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  created_at: string;
  total_uses: number;
  paid_subscriptions: number;
  revenue_cents: number;
}

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const ReferralCodes = () => {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<ReferralCode | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Create dialog state
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(true);

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setIsLoading(true);
    try {
      // Refresh materialized view first
      await supabase.rpc('refresh_referral_stats');
      
      // Load stats
      const { data, error } = await supabase
        .from('referral_stats')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCodes(data || []);
    } catch (error: any) {
      toast.error("Failed to load referral codes: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const handleCreateCode = async () => {
    try {
      const codeToUse = autoGenerate ? generateCode() : newCode.toUpperCase();
      
      if (!codeToUse) {
        toast.error("Please enter a code");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('referral_codes')
        .insert({
          code: codeToUse,
          label: newLabel || null,
          max_uses: newMaxUses ? parseInt(newMaxUses) : null,
          expires_at: newExpiresAt || null,
          created_by: user?.id
        });
      
      if (error) throw error;
      
      toast.success(`Referral code ${codeToUse} created!`);
      setIsCreateDialogOpen(false);
      resetCreateForm();
      loadCodes();
    } catch (error: any) {
      toast.error("Failed to create code: " + error.message);
    }
  };

  const resetCreateForm = () => {
    setNewCode("");
    setNewLabel("");
    setNewMaxUses("");
    setNewExpiresAt("");
    setAutoGenerate(true);
  };

  const copyShareLink = (code: string) => {
    const url = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard!");
  };

  const toggleActive = async (codeId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('referral_codes')
        .update({ active: !currentActive })
        .eq('id', codeId);
      
      if (error) throw error;
      loadCodes();
      toast.success(`Code ${currentActive ? 'deactivated' : 'activated'}`);
    } catch (error: any) {
      toast.error("Failed to update code: " + error.message);
    }
  };

  const deleteCode = async (codeId: string, code: string) => {
    if (!confirm(`Are you sure you want to delete referral code ${code}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('referral_codes')
        .delete()
        .eq('id', codeId);
      
      if (error) throw error;
      loadCodes();
      toast.success(`Referral code ${code} deleted`);
    } catch (error: any) {
      toast.error("Failed to delete code: " + error.message);
    }
  };

  const viewDetails = async (code: ReferralCode) => {
    setSelectedCode(code);
    setIsDetailSheetOpen(true);
    
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('referral_code_id', code.code_id)
        .in('status', ['active', 'paid'])
        .order('paid_at', { ascending: false });
      
      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error: any) {
      toast.error("Failed to load subscriptions: " + error.message);
    }
  };

  const exportCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredCodes = codes.filter(code => {
    const matchesSearch = code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (code.label?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesActive = !showActiveOnly || code.active;
    return matchesSearch && matchesActive;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Referral Codes</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={loadCodes}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={() => exportCSV(filteredCodes, 'referral-codes.csv')}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Code
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search codes or labels..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Switch
            checked={showActiveOnly}
            onCheckedChange={setShowActiveOnly}
          />
          <Label>Active only</Label>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Code</TableHead>
              <TableHead className="w-[150px]">Label</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="text-right w-[80px]">Uses</TableHead>
              <TableHead className="text-right w-[100px]">Revenue</TableHead>
              <TableHead className="text-right w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCodes.map((code) => (
              <TableRow key={code.code_id}>
                <TableCell className="font-mono font-bold">{code.code}</TableCell>
                <TableCell className="truncate max-w-[150px]">{code.label || '-'}</TableCell>
                <TableCell>
                  <Badge variant={code.active ? "default" : "secondary"} className="text-xs">
                    {code.active ? 'Active' : 'Off'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{code.total_uses}</TableCell>
                <TableCell className="text-right font-medium">
                  ${(code.revenue_cents / 100).toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewDetails(code)}
                      title="View details"
                      className="h-8 w-8"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyShareLink(code.code)}
                      title="Copy link"
                      className="h-8 w-8"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCode(code.code_id, code.code)}
                      title="Delete"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Referral Code</DialogTitle>
            <DialogDescription>
              Generate a new referral code or create a custom one.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoGenerate}
                onCheckedChange={setAutoGenerate}
              />
              <Label>Auto-generate code</Label>
            </div>
            
            {!autoGenerate && (
              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="MYCODE123"
                  maxLength={20}
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="label">Label (optional)</Label>
              <Input
                id="label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Summer Campaign 2024"
              />
            </div>
            
            <div>
              <Label htmlFor="maxUses">Max Uses (optional)</Label>
              <Input
                id="maxUses"
                type="number"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            
            <div>
              <Label htmlFor="expiresAt">Expires At (optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCode}>Create Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Code: {selectedCode?.code}</SheetTitle>
            <SheetDescription>
              {selectedCode?.label || 'No label'}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Uses</p>
                <p className="text-2xl font-bold">{selectedCode?.total_uses}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid Subscriptions</p>
                <p className="text-2xl font-bold">{selectedCode?.paid_subscriptions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ${((selectedCode?.revenue_cents || 0) / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">
                  {selectedCode?.total_uses 
                    ? ((selectedCode.paid_subscriptions / selectedCode.total_uses) * 100).toFixed(1)
                    : '0'}%
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Paid Subscriptions</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportCSV(subscriptions, `${selectedCode?.code}-subscriptions.csv`)}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          {sub.paid_at 
                            ? format(new Date(sub.paid_at), 'MMM d, yyyy')
                            : format(new Date(sub.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{sub.plan}</TableCell>
                        <TableCell className="text-right">
                          ${(sub.amount_cents / 100).toFixed(2)} {sub.currency}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sub.status === 'paid' ? 'default' : 'secondary'}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ReferralCodes;
