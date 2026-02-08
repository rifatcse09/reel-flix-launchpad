import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Link2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { subHours } from "date-fns";

interface LinkEventsDialogProps {
  incidentId: string;
  onLinked: () => void;
}

interface EventLog {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export function LinkEventsDialog({ incidentId, onLinked }: LinkEventsDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [linking, setLinking] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    const since = subHours(new Date(), 24).toISOString();
    const { data, error } = await supabase
      .from("system_event_log")
      .select("id, event_type, entity_type, entity_id, status, error_message, created_at")
      .gte("created_at", since)
      .eq("status", "fail")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
    }
    setEvents(data || []);
    setLoading(false);
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setSelected(new Set());
      loadEvents();
    }
  };

  const toggleEvent = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLink = async () => {
    if (selected.size === 0) return;
    setLinking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const rows = Array.from(selected).map(event_id => ({
        incident_id: incidentId,
        event_id,
        linked_by: user.id,
      }));

      const { error } = await supabase.from("incident_linked_events").insert(rows);
      if (error) throw error;

      toast({ title: "Events Linked", description: `${selected.size} event(s) linked to incident.` });
      setOpen(false);
      onLinked();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Link2 className="h-3 w-3" /> Link Failures
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Failed Events (Last 24h)</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No failed events in the last 24 hours.</p>
        ) : (
          <div className="space-y-2">
            {events.map(e => (
              <div
                key={e.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected.has(e.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
                onClick={() => toggleEvent(e.id)}
              >
                <Checkbox checked={selected.has(e.id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{e.event_type}</span>
                    <Badge variant="outline" className="text-[10px]">{e.entity_type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {e.error_message || `Entity: ${e.entity_id}`}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(e.created_at), "MMM d, HH:mm:ss")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleLink} disabled={linking || selected.size === 0} className="gap-1.5">
            {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Link {selected.size} Event{selected.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
