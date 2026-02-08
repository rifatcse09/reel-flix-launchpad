import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SimulatePaymentButtonProps {
  invoiceId: string;
  invoiceNumber: string;
  planName: string | null;
  amountCents: number;
  currency: string;
  onSuccess: () => void;
}

const SimulatePaymentButton = ({
  invoiceId,
  invoiceNumber,
  planName,
  amountCents,
  currency,
  onSuccess,
}: SimulatePaymentButtonProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendTestEmail, setSendTestEmail] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message?: string;
    fulfillment_created?: boolean;
    fulfillment_status?: string;
  } | null>(null);

  const handleSimulate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("simulate-payment", {
        body: {
          invoice_id: invoiceId,
          send_test_email: sendTestEmail,
        },
      });

      if (error) throw error;

      setResult(data);

      if (data?.ok) {
        toast({
          title: "✅ Payment Simulated",
          description: `${invoiceNumber} marked as paid. Fulfillment: ${data.fulfillment_created ? "created" : "check manually"}.`,
        });
        // Delay refresh to allow UI to show result
        setTimeout(() => {
          setOpen(false);
          setResult(null);
          onSuccess();
        }, 2000);
      } else {
        toast({
          title: "Simulation Failed",
          description: data?.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Simulate payment error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to simulate payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setResult(null); }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
          title="Simulate Payment (Test Mode)"
        >
          <FlaskConical className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-400" />
            Simulate Payment
          </DialogTitle>
          <DialogDescription>
            This will run the full payment confirmation workflow without contacting NOWPayments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-mono font-medium">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <Badge variant="outline" className="text-xs">{planName || "—"}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold">${(amountCents / 100).toFixed(2)} {currency}</span>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-200">
                <p className="font-semibold mb-1">This will:</p>
                <ul className="space-y-0.5 list-disc list-inside text-amber-300/80">
                  <li>Create a test payment record (status: confirmed)</li>
                  <li>Mark invoice as <strong>paid</strong></li>
                  <li>Auto-create fulfillment queue entry</li>
                  <li>Log all events to system audit</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="send-test-email"
              checked={sendTestEmail}
              onCheckedChange={(v) => setSendTestEmail(!!v)}
            />
            <label htmlFor="send-test-email" className="text-sm cursor-pointer">
              Send confirmation email to customer
            </label>
          </div>

          {result?.ok && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-1">
                <CheckCircle2 className="h-4 w-4" />
                Simulation Complete
              </div>
              <div className="text-xs text-green-300/80 space-y-0.5">
                <p>Fulfillment: {result.fulfillment_created ? `✅ Created (${result.fulfillment_status})` : "⚠ Not created"}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSimulate}
            disabled={loading || result?.ok}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4" />
            )}
            {loading ? "Simulating..." : "Run Simulation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SimulatePaymentButton;
