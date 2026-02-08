import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Copy, Check, XCircle, DollarSign, Edit } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Subscription {
  id: string;
  user_id: string;
  user_email?: string;
  plan: string;
  amount_cents: number;
  currency: string;
  status: string;
  processor?: string;
  processor_invoice_id?: string | null;
  created_at: string;
  paid_at: string | null;
  ends_at: string | null;
  referral_code_id?: string | null;
}

interface SubscriptionDetailsDrawerProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: (id: string) => void;
  onRefund?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export const SubscriptionDetailsDrawer = ({ 
  subscription, 
  open, 
  onOpenChange,
  onCancel,
  onRefund,
  onEdit
}: SubscriptionDetailsDrawerProps) => {
  const [copiedId, setCopiedId] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast({
      title: "Copied!",
      description: "Subscription ID copied to clipboard",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-primary/20 text-primary border-primary';
      case 'pending':
        return 'bg-warning/20 text-warning border-warning';
      case 'cancelled':
        return 'bg-destructive/20 text-destructive border-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPlanIcon = (plan: string) => {
    const planLower = plan.toLowerCase();
    if (planLower.includes('professional') || planLower.includes('pro')) return '💼';
    if (planLower.includes('elite') || planLower.includes('premium')) return '⭐';
    if (planLower.includes('basic') || planLower.includes('starter')) return '📦';
    return '🎟️';
  };

  if (!subscription) return null;

  const isActive = subscription.status === 'active';
  const renewalDate = subscription.ends_at ? new Date(subscription.ends_at) : null;
  const isExpired = renewalDate && renewalDate < new Date();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {getPlanIcon(subscription.plan)} Subscription Details
            <Badge variant="outline" className={getStatusColor(subscription.status)}>
              {subscription.status}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Complete information for this subscription
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Subscription ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Subscription ID</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md font-mono break-all">
                {subscription.id}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(subscription.id)}
              >
                {copiedId ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Separator />

          {/* User Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">User Information</h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <p className="text-sm font-medium">{subscription.user_email || 'No email'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">User ID</label>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono block mt-1 break-all">
                  {subscription.user_id}
                </code>
              </div>
            </div>
          </div>

          <Separator />

          {/* Plan Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Plan Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Plan Tier</label>
                <p className="text-sm font-medium capitalize flex items-center gap-1">
                  {getPlanIcon(subscription.plan)} {subscription.plan}
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Amount</label>
                <p className="text-sm font-bold text-primary">
                  {subscription.currency} {(subscription.amount_cents / 100).toFixed(2)}
                </p>
              </div>
              {subscription.processor && (
                <div>
                  <label className="text-xs text-muted-foreground">Payment Processor</label>
                  <p className="text-sm font-medium capitalize">{subscription.processor}</p>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">Renewal Status</label>
                <p className="text-sm font-medium">
                  {isActive ? '✅ Auto-renew' : isExpired ? '⏸️ Expired' : '❌ Cancelled'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Timeline</h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Start Date</label>
                <p className="text-sm">{new Date(subscription.created_at).toLocaleString()}</p>
              </div>
              {subscription.paid_at && (
                <div>
                  <label className="text-xs text-muted-foreground">Paid At</label>
                  <p className="text-sm">{new Date(subscription.paid_at).toLocaleString()}</p>
                </div>
              )}
              {subscription.ends_at && (
                <div>
                  <label className="text-xs text-muted-foreground">
                    {isActive ? 'Renewal Date' : 'End Date'}
                  </label>
                  <p className="text-sm">{new Date(subscription.ends_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Processor Invoice Reference */}
          {subscription.processor_invoice_id && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Processor Reference</h3>
                <code className="text-xs bg-muted px-3 py-2 rounded-md font-mono block break-all">
                  {subscription.processor_invoice_id}
                </code>
              </div>
            </>
          )}

          {/* Referral Code */}
          {subscription.referral_code_id && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Referral Code Used</label>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono block">
                  {subscription.referral_code_id}
                </code>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold text-sm mb-3">Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  onClick={() => onEdit(subscription.id)}
                  className="w-full"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Plan
                </Button>
              )}
              {onRefund && subscription.status === 'active' && (
                <Button
                  variant="outline"
                  onClick={() => onRefund(subscription.id)}
                  className="w-full"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Refund
                </Button>
              )}
              {onCancel && subscription.status === 'active' && (
                <Button
                  variant="destructive"
                  onClick={() => onCancel(subscription.id)}
                  className="w-full col-span-2"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
