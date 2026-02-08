import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePermissions, getRoleLabel, type AdminRole } from "@/hooks/usePermissions";
import { useStaffActivityLog } from "@/hooks/useStaffActivityLog";
import { ShieldPlus, Clock, CheckCircle, XCircle, AlertTriangle, User } from "lucide-react";
import { format, addHours } from "date-fns";

interface ElevationRequest {
  id: string;
  requester_id: string;
  requested_role: string;
  reason: string;
  status: string;
  expires_at: string;
  approved_by: string | null;
  approved_at: string | null;
  denied_by: string | null;
  denied_at: string | null;
  denial_reason: string | null;
  revoked_at: string | null;
  created_at: string;
}

const STATUS_BADGES: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  denied: "bg-red-500/20 text-red-400 border-red-500/30",
  expired: "bg-muted text-muted-foreground border-border",
  revoked: "bg-red-500/20 text-red-400 border-red-500/30",
};

const REQUESTABLE_ROLES: AdminRole[] = ["admin", "billing_admin", "support_agent", "fulfillment_agent", "analyst"];

export default function ElevatedPermissions() {
  const [requests, setRequests] = useState<ElevationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [denyOpen, setDenyOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ElevationRequest | null>(null);
  const [form, setForm] = useState({ role: "", reason: "", hours: "4" });
  const [denyReason, setDenyReason] = useState("");
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { role: currentRole, hasPermission } = usePermissions();
  const { logActivity } = useStaffActivityLog();
  const isSuperAdmin = currentRole === "super_admin" || currentRole === "admin";

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data, error } = await supabase
      .from("elevation_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      setRequests(data as ElevationRequest[]);
      
      // Load profiles for requester names
      const userIds = [...new Set(data.map(r => r.requester_id))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);
        if (profileData) {
          const map: Record<string, string> = {};
          profileData.forEach(p => { map[p.id] = p.email || p.full_name || p.id.slice(0, 8); });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  const handleSubmitRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const hours = parseInt(form.hours) || 4;
    const expiresAt = addHours(new Date(), hours);

    const { error } = await supabase.from("elevation_requests").insert({
      requester_id: user.id,
      requested_role: form.role,
      reason: form.reason,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    await logActivity({
      actionType: "change",
      entityType: "elevation_request",
      description: `Requested temporary ${form.role} access for ${hours}h`,
    });

    toast({ title: "Request submitted", description: "Awaiting super_admin approval." });
    setRequestOpen(false);
    setForm({ role: "", reason: "", hours: "4" });
    loadRequests();
  };

  const handleApprove = async (req: ElevationRequest) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("elevation_requests")
      .update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() })
      .eq("id", req.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    await logActivity({
      actionType: "change",
      entityType: "elevation_request",
      entityId: req.id,
      description: `Approved elevation request for ${req.requested_role} by ${profiles[req.requester_id] || req.requester_id}`,
    });

    toast({ title: "Request approved" });
    loadRequests();
  };

  const handleDeny = async () => {
    if (!selectedRequest) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("elevation_requests")
      .update({ status: "denied", denied_by: user.id, denied_at: new Date().toISOString(), denial_reason: denyReason })
      .eq("id", selectedRequest.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    await logActivity({
      actionType: "denied",
      entityType: "elevation_request",
      entityId: selectedRequest.id,
      description: `Denied elevation request for ${selectedRequest.requested_role}: ${denyReason}`,
    });

    toast({ title: "Request denied" });
    setDenyOpen(false);
    setDenyReason("");
    setSelectedRequest(null);
    loadRequests();
  };

  const handleRevoke = async (req: ElevationRequest) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("elevation_requests")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", req.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    await logActivity({
      actionType: "change",
      entityType: "elevation_request",
      entityId: req.id,
      description: `Revoked elevation for ${req.requested_role} from ${profiles[req.requester_id] || req.requester_id}`,
    });

    toast({ title: "Access revoked" });
    loadRequests();
  };

  const isExpired = (req: ElevationRequest) => new Date(req.expires_at) < new Date();

  const getDisplayStatus = (req: ElevationRequest) => {
    if (req.status === "approved" && isExpired(req)) return "expired";
    return req.status;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Elevated Permissions</h1>
          <p className="text-muted-foreground">Request and manage temporary elevated access</p>
        </div>
        <Button onClick={() => setRequestOpen(true)} className="gap-2">
          <ShieldPlus className="h-4 w-4" /> Request Elevation
        </Button>
      </div>

      {/* Active Elevations */}
      {requests.some(r => r.status === "approved" && !isExpired(r)) && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-4 w-4" /> Active Elevated Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requests
                .filter(r => r.status === "approved" && !isExpired(r))
                .map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {profiles[req.requester_id] || req.requester_id.slice(0, 8)}
                      </span>
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        {getRoleLabel(req.requested_role)}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires {format(new Date(req.expires_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                    {isSuperAdmin && (
                      <Button variant="destructive" size="sm" onClick={() => handleRevoke(req)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No elevation requests yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(req => {
                  const displayStatus = getDisplayStatus(req);
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="text-sm">
                        {profiles[req.requester_id] || req.requester_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getRoleLabel(req.requested_role)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {req.reason}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(req.expires_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGES[displayStatus] || STATUS_BADGES.pending}>
                          {displayStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {displayStatus === "pending" && isSuperAdmin && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleApprove(req)}>
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedRequest(req); setDenyOpen(true); }}>
                              <XCircle className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        )}
                        {displayStatus === "approved" && !isExpired(req) && isSuperAdmin && (
                          <Button variant="ghost" size="sm" onClick={() => handleRevoke(req)}>
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Elevated Permissions</DialogTitle>
            <DialogDescription>
              Submit a request for temporary elevated access. Requires super_admin approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                {REQUESTABLE_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Reason for elevation (required)"
              value={form.reason}
              onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))}
              rows={3}
            />
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Duration (hours)</label>
              <Input
                type="number"
                min="1"
                max="24"
                value={form.hours}
                onChange={(e) => setForm(p => ({ ...p, hours: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRequest} disabled={!form.role || !form.reason}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={denyOpen} onOpenChange={setDenyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Request</DialogTitle>
            <DialogDescription>Provide a reason for denying this elevation request.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Denial reason..."
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeny} disabled={!denyReason}>Deny</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
