import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

interface RecurrenceHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationTitle: string;
  recurrenceType?: string;
}

export const RecurrenceHistoryModal = ({ 
  open, 
  onOpenChange, 
  notificationTitle,
  recurrenceType 
}: RecurrenceHistoryModalProps) => {
  // Simulate recurrence run history (in production, fetch from database)
  const generateHistory = () => {
    if (!recurrenceType) return [];
    
    return Array.from({ length: 5 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i * (recurrenceType === 'daily' ? 1 : recurrenceType === 'weekly' ? 7 : 30));
      
      return {
        id: i,
        scheduledFor: date.toISOString(),
        sentAt: i < 3 ? date.toISOString() : null,
        status: i < 3 ? 'sent' : i === 3 ? 'scheduled' : 'pending',
        recipientCount: Math.floor(Math.random() * 500) + 100,
        readCount: i < 3 ? Math.floor(Math.random() * 300) + 50 : 0,
        clickCount: i < 3 ? Math.floor(Math.random() * 150) + 20 : 0,
      };
    });
  };

  const history = generateHistory();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">
            <RefreshCw className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
            Recurrence History: {notificationTitle}
          </DialogTitle>
          <DialogDescription>
            View all scheduled and sent instances of this recurring notification
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recurrence history available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Reads</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>CTR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((run) => {
                  const ctr = run.readCount > 0 
                    ? ((run.clickCount / run.readCount) * 100).toFixed(1) 
                    : '0';
                  
                  return (
                    <TableRow key={run.id}>
                      <TableCell>
                        {new Date(run.scheduledFor).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(run.status)}</TableCell>
                      <TableCell className="font-medium">{run.recipientCount}</TableCell>
                      <TableCell>{run.readCount || '-'}</TableCell>
                      <TableCell>{run.clickCount || '-'}</TableCell>
                      <TableCell>
                        {run.status === 'sent' ? (
                          <span className="text-green-500 font-medium">{ctr}%</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
