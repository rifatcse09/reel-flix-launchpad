import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Clock, Link2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface TimelineEntry {
  id: string;
  message: string;
  status_change: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

interface LinkedEvent {
  id: string;
  event_id: string;
  created_at: string;
}

interface IncidentTimelineProps {
  incidentId: string;
  profiles: Record<string, string>;
}

export function IncidentTimeline({ incidentId, profiles }: IncidentTimelineProps) {
  const { toast } = useToast();
  const [updates, setUpdates] = useState<TimelineEntry[]>([]);
  const [linkedEvents, setLinkedEvents] = useState<LinkedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [posting, setPosting] = useState(false);

  const loadTimeline = async () => {
    setLoading(true);
    const [updatesRes, eventsRes] = await Promise.all([
      supabase
        .from("incident_updates")
        .select("*")
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: true }),
      supabase
        .from("incident_linked_events")
        .select("*")
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: true }),
    ]);
    setUpdates(updatesRes.data || []);
    setLinkedEvents(eventsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTimeline();
  }, [incidentId]);

  const handlePost = async () => {
    if (!message.trim()) return;
    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("incident_updates").insert({
        incident_id: incidentId,
        message: message.trim(),
        is_public: isPublic,
        created_by: user.id,
      });
      if (error) throw error;

      setMessage("");
      setIsPublic(false);
      loadTimeline();
      toast({ title: "Update Posted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Clock className="h-4 w-4" /> Timeline
      </h4>

      {/* Existing updates */}
      <div className="space-y-3 border-l-2 border-border pl-4">
        {updates.length === 0 && linkedEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground">No updates yet.</p>
        ) : (
          <>
            {updates.map(u => (
              <div key={u.id} className="relative">
                <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{profiles[u.created_by] || "Admin"}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(u.created_at), "MMM d, HH:mm")}
                    </span>
                    {u.status_change && (
                      <Badge variant="outline" className="text-[10px]">→ {u.status_change}</Badge>
                    )}
                    {u.is_public && (
                      <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">Public</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5">{u.message}</p>
                </div>
              </div>
            ))}
            {linkedEvents.length > 0 && (
              <div className="relative">
                <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-yellow-500" />
                <div className="text-sm">
                  <span className="font-medium flex items-center gap-1">
                    <Link2 className="h-3 w-3" /> {linkedEvents.length} linked event{linkedEvents.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add update form */}
      <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Add an update..."
          rows={2}
          className="text-sm"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`public-${incidentId}`}
              checked={isPublic}
              onCheckedChange={v => setIsPublic(v === true)}
            />
            <Label htmlFor={`public-${incidentId}`} className="text-xs">Visible on public status page</Label>
          </div>
          <Button size="sm" onClick={handlePost} disabled={posting || !message.trim()} className="gap-1.5">
            {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
