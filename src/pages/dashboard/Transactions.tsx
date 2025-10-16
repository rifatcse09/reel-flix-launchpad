import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Transactions = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground mt-2">View your payment history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>All your transactions in one place</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No transactions yet. Your payment history will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;