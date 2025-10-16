import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Subscriptions = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground mt-2">Manage your active subscriptions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>ReelFlix Premium</CardTitle>
              <CardDescription>Access to all HD content</CardDescription>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Plan:</span> Annual Subscription
            </p>
            <p className="text-sm">
              <span className="font-medium">Price:</span> $16.58/month (billed annually at $199)
            </p>
            <p className="text-sm">
              <span className="font-medium">Next billing:</span> In 5 months and 27 days
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscriptions;