import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, DollarSign, Edit2, History, ShieldAlert, Check, X } from "lucide-react";
import { format } from "date-fns";

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  device_count: number;
  billing_cycle: string;
  price_usd: number;
  active: boolean;
  updated_at: string;
}

interface PriceAuditLog {
  id: string;
  event_type: string;
  entity_id: string;
  metadata: any;
  created_at: string;
  actor_id: string | null;
}

interface PendingChange {
  plan: SubscriptionPlan;
  newPrice: number | null;
  newActive: boolean | null;
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: "Monthly",
  six_month: "6 Months",
  yearly: "Yearly",
  lifetime: "Lifetime",
};

const CYCLE_ORDER = ["monthly", "six_month", "yearly", "lifetime"];

export default function AdminPricingControl() {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<PriceAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("plans");

  const canEdit = hasPermission("manage_settings");

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("billing_cycle")
      .order("device_count");

    if (error) {
      toast({ title: "Error", description: "Failed to load plans", variant: "destructive" });
    } else {
      setPlans((data as SubscriptionPlan[]) || []);
      // Initialize edit values
      const vals: Record<string, string> = {};
      (data as SubscriptionPlan[]).forEach((p) => {
        vals[p.id] = p.price_usd.toFixed(2);
      });
      setEditValues(vals);
    }
    setLoading(false);
  }, [toast]);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    const { data, error } = await supabase
      .from("system_event_log")
      .select("*")
      .in("event_type", ["pricing_plan_price_changed", "pricing_plan_status_changed"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) setAuditLogs(data as PriceAuditLog[]);
    setAuditLoading(false);
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (activeTab === "audit") fetchAuditLogs();
  }, [activeTab, fetchAuditLogs]);

  const requestPriceChange = (plan: SubscriptionPlan) => {
    const newPrice = parseFloat(editValues[plan.id]);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ title: "Invalid price", description: "Please enter a valid positive number", variant: "destructive" });
      return;
    }
    if (newPrice === plan.price_usd) {
      toast({ title: "No change", description: "Price is the same as current value" });
      return;
    }
    setPendingChange({ plan, newPrice, newActive: null });
  };

  const requestStatusChange = (plan: SubscriptionPlan, newActive: boolean) => {
    setPendingChange({ plan, newPrice: null, newActive });
  };

  const confirmChange = async () => {
    if (!pendingChange) return;
    setSaving(true);

    const { plan, newPrice, newActive } = pendingChange;
    const { data: { user } } = await supabase.auth.getUser();
    const adminId = user?.id || null;

    try {
      if (newPrice !== null) {
        // Price change
        const { error } = await supabase
          .from("subscription_plans")
          .update({ price_usd: newPrice, updated_at: new Date().toISOString() })
          .eq("id", plan.id);

        if (error) throw error;

        // Audit log
        await supabase.from("system_event_log").insert({
          event_type: "pricing_plan_price_changed",
          entity_type: "subscription_plan",
          entity_id: plan.id,
          status: "success",
          actor_id: adminId,
          metadata: {
            plan_name: plan.plan_name,
            billing_cycle: plan.billing_cycle,
            device_count: plan.device_count,
            previous_price_usd: plan.price_usd,
            new_price_usd: newPrice,
            changed_at: new Date().toISOString(),
            admin_id: adminId,
          },
        });

        toast({
          title: "Price updated",
          description: `${plan.plan_name} (${CYCLE_LABELS[plan.billing_cycle]}, ${plan.device_count} devices): $${plan.price_usd} → $${newPrice}`,
        });
      } else if (newActive !== null) {
        // Status change
        const { error } = await supabase
          .from("subscription_plans")
          .update({ active: newActive, updated_at: new Date().toISOString() })
          .eq("id", plan.id);

        if (error) throw error;

        // Audit log
        await supabase.from("system_event_log").insert({
          event_type: "pricing_plan_status_changed",
          entity_type: "subscription_plan",
          entity_id: plan.id,
          status: "success",
          actor_id: adminId,
          metadata: {
            plan_name: plan.plan_name,
            billing_cycle: plan.billing_cycle,
            device_count: plan.device_count,
            previous_active: plan.active,
            new_active: newActive,
            changed_at: new Date().toISOString(),
            admin_id: adminId,
          },
        });

        toast({
          title: `Plan ${newActive ? "activated" : "deactivated"}`,
          description: `${plan.plan_name} (${CYCLE_LABELS[plan.billing_cycle]}, ${plan.device_count} devices) is now ${newActive ? "active" : "inactive"}.`,
        });
      }

      await fetchPlans();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
      setPendingChange(null);
    }
  };

  const plansByCycle = CYCLE_ORDER.map((cycle) => ({
    cycle,
    plans: plans.filter((p) => p.billing_cycle === cycle),
  })).filter(({ plans }) => plans.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-accent" />
            Pricing Control Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage subscription plans live — changes apply immediately to invoice creation.
          </p>
        </div>
        {!canEdit && (
          <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg px-4 py-2">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-sm font-medium">View only — insufficient permissions to edit</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CYCLE_ORDER.map((cycle) => {
          const cyclePlans = plans.filter((p) => p.billing_cycle === cycle);
          const activePlans = cyclePlans.filter((p) => p.active).length;
          return (
            <Card key={cycle} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">{CYCLE_LABELS[cycle]}</div>
                <div className="text-2xl font-bold text-foreground">{cyclePlans.length}</div>
                <div className="text-xs text-muted-foreground">
                  {activePlans} active · {cyclePlans.length - activePlans} inactive
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-4 space-y-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            plansByCycle.map(({ cycle, plans: cyclePlans }) => (
              <Card key={cycle} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{CYCLE_LABELS[cycle]} Plans</CardTitle>
                      <CardDescription>
                        {cyclePlans.filter((p) => p.active).length} of {cyclePlans.length} active
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {cycle}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead>Plan</TableHead>
                        <TableHead>Devices</TableHead>
                        <TableHead>Current Price</TableHead>
                        {canEdit && <TableHead>New Price (USD)</TableHead>}
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        {canEdit && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cyclePlans.map((plan) => (
                        <TableRow key={plan.id} className="border-border">
                          <TableCell className="font-medium">{plan.plan_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono">
                              {plan.device_count} {plan.device_count === 1 ? "device" : "devices"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-lg font-bold text-foreground">
                              ${plan.price_usd.toFixed(2)}
                            </span>
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground text-sm">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editValues[plan.id] ?? plan.price_usd.toFixed(2)}
                                  onChange={(e) =>
                                    setEditValues((prev) => ({ ...prev, [plan.id]: e.target.value }))
                                  }
                                  className="w-28 h-8 text-sm font-mono"
                                />
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {canEdit ? (
                                <Switch
                                  checked={plan.active}
                                  onCheckedChange={(checked) => requestStatusChange(plan, checked)}
                                />
                              ) : null}
                              <Badge
                                className={
                                  plan.active
                                    ? "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/15"
                                    : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/15"
                                }
                              >
                                {plan.active ? (
                                  <><Check className="h-3 w-3 mr-1" />Active</>
                                ) : (
                                  <><X className="h-3 w-3 mr-1" />Inactive</>
                                )}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(plan.updated_at), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => requestPriceChange(plan)}
                                disabled={
                                  parseFloat(editValues[plan.id] ?? "") === plan.price_usd ||
                                  isNaN(parseFloat(editValues[plan.id] ?? ""))
                                }
                                className="gap-1"
                              >
                                <Edit2 className="h-3 w-3" />
                                Save Price
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="mt-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-accent" />
                Price Change Audit Log
              </CardTitle>
              <CardDescription>
                Full history of all pricing changes with admin ID and timestamps.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {auditLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No price changes recorded yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Billing Cycle</TableHead>
                      <TableHead>Devices</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Admin ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => {
                      const m = log.metadata || {};
                      const isPriceChange = log.event_type === "pricing_plan_price_changed";
                      return (
                        <TableRow key={log.id} className="border-border">
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                          </TableCell>
                          <TableCell className="font-medium">{m.plan_name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {CYCLE_LABELS[m.billing_cycle] || m.billing_cycle || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>{m.device_count ?? "—"}</TableCell>
                          <TableCell>
                            {isPriceChange ? (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground line-through">
                                  ${Number(m.previous_price_usd).toFixed(2)}
                                </span>
                                <span className="text-foreground font-bold">
                                  → ${Number(m.new_price_usd).toFixed(2)}
                                </span>
                                {m.new_price_usd < m.previous_price_usd ? (
                                  <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] hover:bg-red-500/15">
                                    -{(m.previous_price_usd - m.new_price_usd).toFixed(2)}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] hover:bg-green-500/15">
                                    +{(m.new_price_usd - m.previous_price_usd).toFixed(2)}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-sm">
                                <Badge
                                  className={
                                    m.new_active
                                      ? "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/15"
                                      : "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/15"
                                  }
                                >
                                  {m.new_active ? "Activated" : "Deactivated"}
                                </Badge>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {(log.actor_id || m.admin_id || "—").slice(0, 8)}…
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Modal */}
      <Dialog open={!!pendingChange} onOpenChange={(open) => { if (!open) setPendingChange(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <ShieldAlert className="h-5 w-5" />
              Confirm Pricing Change
            </DialogTitle>
            <DialogDescription>
              This change will apply <strong>immediately</strong> to all new invoice creation.
              Existing invoices are not affected.
            </DialogDescription>
          </DialogHeader>

          {pendingChange && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{pendingChange.plan.plan_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billing cycle</span>
                  <span className="font-medium">{CYCLE_LABELS[pendingChange.plan.billing_cycle]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Devices</span>
                  <span className="font-medium">{pendingChange.plan.device_count}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  {pendingChange.newPrice !== null ? (
                    <>
                      <span className="text-muted-foreground">Price change</span>
                      <span>
                        <span className="line-through text-muted-foreground mr-2">
                          ${pendingChange.plan.price_usd.toFixed(2)}
                        </span>
                        <span className="text-foreground text-base">
                          → ${pendingChange.newPrice.toFixed(2)}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">Status change</span>
                      <span className={pendingChange.newActive ? "text-green-400" : "text-destructive"}>
                        {pendingChange.newActive ? "Activate plan" : "Deactivate plan"}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ This action is logged with your admin ID and timestamp.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingChange(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={confirmChange} disabled={saving} className="bg-accent hover:bg-accent/90">
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
              ) : (
                "Confirm Change"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
