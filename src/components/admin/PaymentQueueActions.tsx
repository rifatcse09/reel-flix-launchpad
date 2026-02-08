import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import SimulatePaymentButton from "./SimulatePaymentButton";

interface PaymentQueueActionsProps {
  invoiceId: string;
  invoiceNumber: string;
  planName: string | null;
  amountCents: number;
  currency: string;
  isFlagged: boolean;
  loadingAction: string | null;
  onMarkPaid: (invoiceId: string) => void;
  onReject: (invoiceId: string) => void;
  onFlag: (invoiceId: string) => void;
  onSimulateSuccess: () => void;
}

const PaymentQueueActions = ({
  invoiceId,
  invoiceNumber,
  planName,
  amountCents,
  currency,
  isFlagged,
  loadingAction,
  onMarkPaid,
  onReject,
  onFlag,
  onSimulateSuccess,
}: PaymentQueueActionsProps) => {
  const isLoading = loadingAction === invoiceId;

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
        onClick={() => onMarkPaid(invoiceId)}
        disabled={isLoading}
        title="Mark as Paid"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
        onClick={() => onReject(invoiceId)}
        disabled={isLoading}
        title="Reject Payment"
      >
        <XCircle className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className={`h-7 px-2 ${
          isFlagged
            ? "text-amber-300 bg-amber-500/10"
            : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
        }`}
        onClick={() => onFlag(invoiceId)}
        disabled={isLoading}
        title="Flag for Review"
      >
        <AlertTriangle className="h-4 w-4" />
      </Button>
      <SimulatePaymentButton
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        planName={planName}
        amountCents={amountCents}
        currency={currency}
        onSuccess={onSimulateSuccess}
      />
    </div>
  );
};

export default PaymentQueueActions;
