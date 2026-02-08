import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import PaymentQueueActions from "./PaymentQueueActions";

export interface PaymentInfo {
  id: string;
  status: string;
  provider: string | null;
  processor_payment_id: string | null;
  tx_hash: string | null;
  method: string;
  amount_received_cents: number | null;
  from_address: string | null;
  to_address: string | null;
  chain: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_number: string;
  user_id: string;
  plan_name: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  discount_cents: number;
  issued_at: string | null;
  notes: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
  payments: PaymentInfo[];
}

const shortenAddress = (addr: string | null): string => {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};

const getPaymentStatusBadge = (payments: PaymentInfo[]) => {
  if (payments.length === 0) return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">No Payment</Badge>;
  const payment = payments[0];
  switch (payment.status) {
    case "confirmed":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0">Confirmed</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-1.5 py-0">Pending</Badge>;
    case "failed":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0">Failed</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{payment.status}</Badge>;
  }
};

interface PaymentQueueTableProps {
  items: InvoiceItem[];
  flaggedIds: Set<string>;
  loadingAction: string | null;
  onMarkPaid: (invoiceId: string) => void;
  onReject: (invoiceId: string) => void;
  onFlag: (invoiceId: string) => void;
}

const PaymentQueueTable = ({
  items,
  flaggedIds,
  loadingAction,
  onMarkPaid,
  onReject,
  onFlag,
}: PaymentQueueTableProps) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400/50" />
        <p className="text-lg font-medium">No payments to verify</p>
        <p className="text-sm">All caught up!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="h-9 px-3">Customer</TableHead>
            <TableHead className="h-9 px-3">Invoice</TableHead>
            <TableHead className="h-9 px-3">Plan</TableHead>
            <TableHead className="h-9 px-3">Expected</TableHead>
            <TableHead className="h-9 px-3">Received</TableHead>
            <TableHead className="h-9 px-3">Provider</TableHead>
            <TableHead className="h-9 px-3">Wallet</TableHead>
            <TableHead className="h-9 px-3">Status</TableHead>
            <TableHead className="h-9 px-3">Time</TableHead>
            <TableHead className="h-9 px-3 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const payment = item.payments[0];
            const isFlagged = flaggedIds.has(item.id);
            const timeAgo = payment
              ? formatDistanceToNow(new Date(payment.created_at), { addSuffix: false })
              : formatDistanceToNow(new Date(item.created_at), { addSuffix: false });

            return (
              <TableRow
                key={item.id}
                className={`text-sm ${isFlagged ? "bg-amber-500/5 border-l-2 border-l-amber-400" : ""}`}
              >
                {/* Customer */}
                <TableCell className="px-3 py-2">
                  <p className="font-medium text-sm leading-tight truncate max-w-[140px]">
                    {item.profiles?.full_name || "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                    {item.profiles?.email || "—"}
                  </p>
                </TableCell>

                {/* Invoice */}
                <TableCell className="px-3 py-2">
                  <span className="font-mono text-xs">{item.invoice_number}</span>
                </TableCell>

                {/* Plan */}
                <TableCell className="px-3 py-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {item.plan_name || "—"}
                  </Badge>
                </TableCell>

                {/* Expected */}
                <TableCell className="px-3 py-2">
                  <span className="font-medium text-sm">
                    ${(item.amount_cents / 100).toFixed(2)}
                  </span>
                  {item.discount_cents > 0 && (
                    <p className="text-[10px] text-green-400">
                      -${(item.discount_cents / 100).toFixed(2)}
                    </p>
                  )}
                </TableCell>

                {/* Received */}
                <TableCell className="px-3 py-2">
                  {payment?.amount_received_cents ? (
                    <span className={`font-medium text-sm ${
                      payment.amount_received_cents >= item.amount_cents - item.discount_cents
                        ? "text-green-400"
                        : "text-amber-400"
                    }`}>
                      ${(payment.amount_received_cents / 100).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>

                {/* Provider */}
                <TableCell className="px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-xs capitalize">{payment?.provider || payment?.method || "—"}</p>
                    {payment?.chain && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        {payment.chain}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Wallet */}
                <TableCell className="px-3 py-2">
                  {payment?.from_address ? (
                    <div className="space-y-0.5">
                      <p className="font-mono text-[11px]" title={payment.from_address}>
                        {shortenAddress(payment.from_address)}
                      </p>
                      {payment.to_address && (
                        <p className="text-[10px] text-muted-foreground" title={payment.to_address}>
                          → {shortenAddress(payment.to_address)}
                        </p>
                      )}
                    </div>
                  ) : payment?.tx_hash ? (
                    <p className="font-mono text-[11px]" title={payment.tx_hash}>
                      {shortenAddress(payment.tx_hash)}
                    </p>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    {getPaymentStatusBadge(item.payments)}
                    {isFlagged && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    )}
                  </div>
                </TableCell>

                {/* Time */}
                <TableCell className="px-3 py-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
                </TableCell>

                {/* Actions */}
                <TableCell className="px-3 py-2 text-right">
                  <PaymentQueueActions
                    invoiceId={item.id}
                    isFlagged={isFlagged}
                    loadingAction={loadingAction}
                    onMarkPaid={onMarkPaid}
                    onReject={onReject}
                    onFlag={onFlag}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default PaymentQueueTable;
