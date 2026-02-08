import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye } from "lucide-react";

export interface Transaction {
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
}

interface PaymentTransactionsTableProps {
  transactions: Transaction[];
  hasFilters: boolean;
  onViewTransaction: (transaction: Transaction) => void;
}

const getStatusVariant = (status: string): "outline" | "default" | "secondary" | "destructive" => {
  switch (status) {
    case 'active': return 'default';
    case 'pending': return 'secondary';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

const getStatusClassName = (status: string) => {
  switch (status) {
    case 'active': return 'bg-primary/20 text-primary border-primary';
    case 'pending': return 'bg-warning/20 text-warning border-warning';
    case 'cancelled': return 'bg-destructive/20 text-destructive border-destructive';
    default: return '';
  }
};

const getProcessorClassName = (processor: string) => {
  switch (processor.toLowerCase()) {
    case 'nowpayments': return 'bg-primary/20 text-primary border-primary';
    case 'crypto': return 'bg-blue-500/20 text-blue-500 border-blue-500';
    case 'manual': return 'bg-purple-500/20 text-purple-500 border-purple-500';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const PaymentTransactionsTable = ({
  transactions,
  hasFilters,
  onViewTransaction,
}: PaymentTransactionsTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Payment Method</TableHead>
          <TableHead>Processor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Invoice ID</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
              {hasFilters ? "No transactions found matching your filters" : "No transactions found"}
            </TableCell>
          </TableRow>
        ) : (
          transactions.map((transaction) => (
            <TableRow key={transaction.id} className="hover:bg-muted/50 transition-colors">
              <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="font-medium">{transaction.user_email}</TableCell>
              <TableCell className="capitalize">{transaction.plan}</TableCell>
              <TableCell className="font-medium">
                {transaction.currency} {(transaction.amount_cents / 100).toFixed(2)}
              </TableCell>
              <TableCell className="capitalize">{transaction.payment_method}</TableCell>
              <TableCell>
                <Badge variant="outline" className={getProcessorClassName(transaction.processor)}>
                  {transaction.processor}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={getStatusVariant(transaction.status)}
                  className={`gap-1 ${getStatusClassName(transaction.status)}`}
                >
                  {transaction.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">
                {transaction.processor_invoice_id ? (
                  <span className="text-muted-foreground">
                    {transaction.processor_invoice_id.length > 16
                      ? `${transaction.processor_invoice_id.slice(0, 16)}…`
                      : transaction.processor_invoice_id}
                  </span>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => onViewTransaction(transaction)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View transaction details</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
