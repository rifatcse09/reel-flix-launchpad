import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle2, XCircle, FileQuestion, CircleDot } from "lucide-react";

/**
 * Shared status badge components for invoices and payments.
 * Used across admin and customer-facing pages for consistency.
 */

export const getInvoiceStatusBadge = (status: string, isFlagged?: boolean) => {
  const flagIcon = isFlagged ? (
    <AlertTriangle className="h-3 w-3 ml-0.5" />
  ) : null;

  switch (status) {
    case "paid":
      return (
        <Badge className="bg-green-500/15 text-green-400 border-green-500/30 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Paid
          {flagIcon}
        </Badge>
      );
    case "unpaid":
      return (
        <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 gap-1">
          <Clock className="h-3 w-3" />
          {isFlagged ? "Flagged" : "Awaiting Verification"}
          {flagIcon}
        </Badge>
      );
    case "void":
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/30 gap-1">
          <XCircle className="h-3 w-3" />
          Void
        </Badge>
      );
    case "draft":
      return (
        <Badge className="bg-muted/30 text-muted-foreground border-muted/40 gap-1">
          <FileQuestion className="h-3 w-3" />
          Draft
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case "confirmed":
      return (
        <Badge className="bg-green-500/15 text-green-400 border-green-500/30 gap-1 text-[10px] px-1.5 py-0">
          <CheckCircle2 className="h-3 w-3" />
          Confirmed
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 gap-1 text-[10px] px-1.5 py-0">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/30 gap-1 text-[10px] px-1.5 py-0">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
          <CircleDot className="h-3 w-3" />
          {status}
        </Badge>
      );
  }
};

export const getFlaggedBadge = () => (
  <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1 text-[10px] px-1.5 py-0">
    <AlertTriangle className="h-3 w-3" />
    Flagged
  </Badge>
);
