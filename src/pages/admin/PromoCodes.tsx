import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface PromoCode {
  id: string;
  code: string;
  type: string;
  value: string;
  startdate: string;
  expirationdate: string;
  maxuses: number;
  uses: number;
  recurring: string;
  notes: string;
}

export default function PromoCodes() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  
  const [formData, setFormData] = useState({
    code: "",
    type: "Percentage",
    value: "",
    startdate: new Date().toISOString().split('T')[0],
    expirationdate: "",
    maxuses: 0,
    recurring: "0",
    cycles: "",
    notes: "",
  });

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('whmcs-promotions', {
        body: { action: 'list' }
      });

      if (error) throw error;
      
      setPromoCodes(data.promotions?.promotion || []);
    } catch (error: any) {
      console.error('Error fetching promo codes:', error);
      toast.error('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const action = editingPromo ? 'update' : 'create';
      const body = editingPromo 
        ? { action, promotionid: editingPromo.id, ...formData }
        : { action, ...formData };

      const { error } = await supabase.functions.invoke('whmcs-promotions', { body });

      if (error) throw error;

      toast.success(`Promo code ${editingPromo ? 'updated' : 'created'} successfully`);
      setIsDialogOpen(false);
      setEditingPromo(null);
      setFormData({
        code: "",
        type: "Percentage",
        value: "",
        startdate: new Date().toISOString().split('T')[0],
        expirationdate: "",
        maxuses: 0,
        recurring: "0",
        cycles: "",
        notes: "",
      });
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error saving promo code:', error);
      toast.error(error.message || 'Failed to save promo code');
    }
  };

  const handleDelete = async (promotionid: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase.functions.invoke('whmcs-promotions', {
        body: { action: 'delete', promotionid }
      });

      if (error) throw error;

      toast.success('Promo code deleted successfully');
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error deleting promo code:', error);
      toast.error('Failed to delete promo code');
    }
  };

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      type: promo.type,
      value: promo.value,
      startdate: promo.startdate,
      expirationdate: promo.expirationdate,
      maxuses: promo.maxuses,
      recurring: promo.recurring,
      cycles: "",
      notes: promo.notes || "",
    });
    setIsDialogOpen(true);
  };

  const isExpired = (expirationdate: string) => {
    if (!expirationdate || expirationdate === '0000-00-00') return false;
    return new Date(expirationdate) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">WHMCS Promo Codes</h1>
          <p className="text-muted-foreground">Create and manage promotional discount codes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingPromo(null);
              setFormData({
                code: "",
                type: "Percentage",
                value: "",
                startdate: new Date().toISOString().split('T')[0],
                expirationdate: "",
                maxuses: 0,
                recurring: "0",
                cycles: "",
                notes: "",
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Promo Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPromo ? 'Edit' : 'Create'} Promo Code</DialogTitle>
              <DialogDescription>
                {editingPromo ? 'Update the' : 'Create a new'} promotional code for WHMCS
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Promo Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="SAVE20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Discount Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Percentage">Percentage</SelectItem>
                      <SelectItem value="Fixed Amount">Fixed Amount</SelectItem>
                      <SelectItem value="Price Override">Price Override</SelectItem>
                      <SelectItem value="Free Setup">Free Setup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Discount Value *</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder={formData.type === "Percentage" ? "20" : "10.00"}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxuses">Max Uses (0 = unlimited)</Label>
                  <Input
                    id="maxuses"
                    type="number"
                    value={formData.maxuses}
                    onChange={(e) => setFormData({ ...formData, maxuses: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startdate">Start Date *</Label>
                  <Input
                    id="startdate"
                    type="date"
                    value={formData.startdate}
                    onChange={(e) => setFormData({ ...formData, startdate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expirationdate">Expiration Date</Label>
                  <Input
                    id="expirationdate"
                    type="date"
                    value={formData.expirationdate}
                    onChange={(e) => setFormData({ ...formData, expirationdate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurring">Recurring Discount</Label>
                <Select value={formData.recurring} onValueChange={(value) => setFormData({ ...formData, recurring: value })}>
                  <SelectTrigger id="recurring">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">One-time only</SelectItem>
                    <SelectItem value="1">Apply to recurring invoices</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Internal notes about this promo code..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPromo ? 'Update' : 'Create'} Promo Code
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {promoCodes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No promo codes created yet</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Promo Code
                </Button>
              </CardContent>
            </Card>
          ) : (
            promoCodes.map((promo) => (
              <Card key={promo.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {promo.code}
                        {isExpired(promo.expirationdate) && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                        {promo.maxuses > 0 && promo.uses >= promo.maxuses && (
                          <Badge variant="secondary">Limit Reached</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {promo.type === "Percentage" ? `${promo.value}% off` : `$${promo.value} off`}
                        {promo.recurring === "1" && " (recurring)"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(promo)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDelete(promo.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-medium">{promo.startdate}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expiration</p>
                      <p className="font-medium">
                        {promo.expirationdate && promo.expirationdate !== '0000-00-00' 
                          ? promo.expirationdate 
                          : 'No expiration'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Uses</p>
                      <p className="font-medium">
                        {promo.uses} / {promo.maxuses > 0 ? promo.maxuses : '∞'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium">{promo.recurring === "1" ? "Recurring" : "One-time"}</p>
                    </div>
                  </div>
                  {promo.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">{promo.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
