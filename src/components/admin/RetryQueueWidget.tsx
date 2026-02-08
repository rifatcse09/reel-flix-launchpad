import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, RotateCcw, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

interface RetryItem {
  id: string;
  operation_type: string;
  operation_data: Record<string, unknown>;
  entity_type: string;
  entity_id: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export function RetryQueueWidget() {
  const { toast } = useToast();
  const [items, setItems] = useState<RetryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("retry_queue")
        .select("*")
        .in("status", ["pending", "retrying", "failed"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setItems((data as RetryItem[]) || []);
    } catch (err) {
      console.error("Failed to load retry queue:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleManualRetry = async (item: RetryItem) => {
    setRetrying(item.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Attempt the operation
      let success = false;
      let error_msg = "";

      if (item.operation_type === "email") {
        const opData = item.operation_data as { invoice_id?: string; type?: string };
        const { error } = await supabase.functions.invoke("send-invoice-email", {
          body: { invoice_id: opData.invoice_id, type: opData.type },
        });
        if (error) {
          error_msg = error.message;
        } else {
          success = true;
        }
      } else {
        // Generic retry — mark for processing
        success = false;
        error_msg = "Manual retry not supported for this operation type";
      }

      if (success) {
        await supabase
          .from("retry_queue")
          .update({
            status: "succeeded",
            resolved_at: new Date().toISOString(),
            resolved_by: user?.id,
            attempts: item.attempts + 1,
          })
          .eq("id", item.id);

        toast({ title: "Retry Succeeded", description: `${item.operation_type} operation completed.` });
      } else {
        await supabase
          .from("retry_queue")
          .update({
            status: item.attempts + 1 >= item.max_attempts ? "exhausted" : "failed",
            attempts: item.attempts + 1,
            last_error: error_msg,
            next_retry_at: getNextRetryTime(item.attempts + 1),
          })
          .eq("id", item.id);

        toast({
          title: "Retry Failed",
          description: error_msg || "Operation failed again",
          variant: "destructive",
        });
      }

      loadQueue();
    } catch (err) {
      console.error("Manual retry error:", err);
      toast({ title: "Error", description: "Failed to retry operation", variant: "destructive" });
    } finally {
      setRetrying(null);
    }
  };

  const handleDismiss = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("retry_queue")
      .update({
        status: "exhausted",
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
      })
      .eq("id", id);
    loadQueue();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />Pending</Badge>;
      case "retrying":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]"><RotateCcw className="h-2.5 w-2.5 mr-1" />Retrying</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]"><XCircle className="h-2.5 w-2.5 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RotateCcw className="h-5 w-5 text-amber-400" />
              Retry Queue
              {items.length > 0 && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 ml-2">
                  {items.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Failed operations awaiting retry</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadQueue} className="gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400/50" />
            <p className="text-sm">No pending retries</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="h-8">Type</TableHead>
                <TableHead className="h-8">Entity</TableHead>
                <TableHead className="h-8">Status</TableHead>
                <TableHead className="h-8">Attempts</TableHead>
                <TableHead className="h-8">Error</TableHead>
                <TableHead className="h-8">Next Retry</TableHead>
                <TableHead className="h-8 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="text-xs">
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{item.operation_type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[10px]">
                    {item.entity_type}/{item.entity_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>
                    <span className={item.attempts >= item.max_attempts - 1 ? "text-red-400 font-bold" : ""}>
                      {item.attempts}/{item.max_attempts}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-red-400/80">
                    {item.last_error || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.next_retry_at
                      ? formatDistanceToNow(new Date(item.next_retry_at), { addSuffix: true })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] gap-1"
                        disabled={retrying === item.id}
                        onClick={() => handleManualRetry(item)}
                      >
                        {retrying === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Retry
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px]"
                        onClick={() => handleDismiss(item.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function getNextRetryTime(attempt: number): string {
  // Exponential backoff: 5m, 15m, 1h, 4h, 12h
  const delays = [5 * 60, 15 * 60, 60 * 60, 4 * 60 * 60, 12 * 60 * 60];
  const delaySec = delays[Math.min(attempt - 1, delays.length - 1)];
  return new Date(Date.now() + delaySec * 1000).toISOString();
}
