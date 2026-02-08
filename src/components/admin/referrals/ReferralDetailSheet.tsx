import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ReferralCode } from "./ReferralCodesTable";

interface ReferralDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCode: ReferralCode | null;
  subscriptions: any[];
}

export const ReferralDetailSheet = ({
  open,
  onOpenChange,
  selectedCode,
  subscriptions,
}: ReferralDetailSheetProps) => {
  const { toast } = useToast();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Code: {selectedCode?.code}</SheetTitle>
          <SheetDescription>{selectedCode?.label || 'No label'}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Uses</p>
              <p className="text-2xl font-bold">{selectedCode?.use_count || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clicks</p>
              <p className="text-2xl font-bold">{selectedCode?.click_count || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">${(selectedCode?.revenue || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold">
                {selectedCode?.click_count && selectedCode.click_count > 0
                  ? (((selectedCode.use_count || 0) / selectedCode.click_count) * 100).toFixed(1)
                  : '0'}
                %
              </p>
            </div>
            {selectedCode && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Referral Link</p>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const affiliateLink = `${window.location.origin}/register?ref=${selectedCode.code}`;
                      navigator.clipboard.writeText(affiliateLink);
                      toast({ title: "Copied!", description: "Referral link copied to clipboard" });
                    }}
                  >
                    Copy Referral Link
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                  {window.location.origin}/register?ref={selectedCode.code}
                </p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Tracking</p>
              <p className="text-sm font-medium mt-1">Internal tracking only — managed within ReelFlix</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Paid Subscriptions ({subscriptions.length})</h3>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No paid subscriptions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          {sub.paid_at
                            ? new Date(sub.paid_at).toLocaleDateString()
                            : new Date(sub.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{sub.plan}</TableCell>
                        <TableCell className="text-right">
                          ${(sub.amount_cents / 100).toFixed(2)} {sub.currency}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sub.status === 'paid' ? 'default' : 'secondary'}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
