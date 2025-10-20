import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  user_id: string;
  user_email?: string;
  plan: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_method: string;
  processor: string;
  processor_invoice_id: string | null;
  created_at: string;
  paid_at: string | null;
  ends_at: string | null;
  referral_code_id?: string | null;
}

interface TransactionDetailsDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TransactionDetailsDrawer = ({ transaction, open, onOpenChange }: TransactionDetailsDrawerProps) => {
  const [copiedId, setCopiedId] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast({
      title: "Copied!",
      description: "Transaction ID copied to clipboard",
    });
  };

  const getProcessorColor = (processor: string) => {
    switch (processor.toLowerCase()) {
      case 'stripe':
        return 'bg-primary/20 text-primary border-primary';
      case 'paypal':
        return 'bg-blue-500/20 text-blue-500 border-blue-500';
      case 'sensapay':
        return 'bg-purple-500/20 text-purple-500 border-purple-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
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

  if (!transaction) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Transaction Details
            <Badge variant="outline" className={getStatusColor(transaction.status)}>
              {transaction.status}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Complete information for this payment transaction
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Transaction ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md font-mono break-all">
                {transaction.id}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(transaction.id)}
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
                <p className="text-sm font-medium">{transaction.user_email || 'No email'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">User ID</label>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono block mt-1 break-all">
                  {transaction.user_id}
                </code>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Payment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Plan Type</label>
                <p className="text-sm font-medium capitalize">{transaction.plan}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Amount</label>
                <p className="text-sm font-bold text-primary">
                  {transaction.currency} {(transaction.amount_cents / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Payment Method</label>
                <p className="text-sm font-medium capitalize">{transaction.payment_method}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Processor</label>
                <Badge variant="outline" className={getProcessorColor(transaction.processor)}>
                  {transaction.processor}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Timeline</h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Created At</label>
                <p className="text-sm">{new Date(transaction.created_at).toLocaleString()}</p>
              </div>
              {transaction.paid_at && (
                <div>
                  <label className="text-xs text-muted-foreground">Paid At</label>
                  <p className="text-sm">{new Date(transaction.paid_at).toLocaleString()}</p>
                </div>
              )}
              {transaction.ends_at && (
                <div>
                  <label className="text-xs text-muted-foreground">Expires At</label>
                  <p className="text-sm">{new Date(transaction.ends_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Link */}
          {transaction.processor_invoice_id && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Invoice</h3>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  asChild
                >
                  <a
                    href={`https://dashboard.stripe.com/invoices/${transaction.processor_invoice_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>View Stripe Invoice</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </>
          )}

          {/* Referral Code */}
          {transaction.referral_code_id && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Referral Code Used</label>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono block">
                  {transaction.referral_code_id}
                </code>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
