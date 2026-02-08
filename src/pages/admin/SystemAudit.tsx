import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, RefreshCw, Shield, Activity, Zap,
  Database, Webhook, CheckCircle2, XCircle, Clock,
  Search, ChevronDown, ChevronRight
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// ── Static registry of triggers, edge functions, webhooks ─────────
const TRIGGERS_REGISTRY = [
  {
    name: "generate_rf_invoice_number_trigger",
    table: "invoices",
    event: "BEFORE INSERT",
    description: "Auto-generates RF-YYYY-XXXXXX invoice numbers on new invoices",
    idempotent: true,
  },
  {
    name: "trg_auto_fulfillment_on_invoice_paid",
    table: "invoices",
    event: "AFTER UPDATE",
    description: "When invoice status → paid, auto-creates fulfillment row (prevents duplicates via NOT EXISTS check + unique index)",
    idempotent: true,
  },
  {
    name: "trg_validate_invoice_status",
    table: "invoices",
    event: "BEFORE UPDATE",
    description: "Validates invoice status transitions (unpaid→paid/void, paid→void). Blocks invalid transitions.",
    idempotent: true,
  },
  {
    name: "trg_validate_payment_status",
    table: "payments",
    event: "BEFORE UPDATE",
    description: "Validates payment status transitions (pending→confirmed/failed). Blocks invalid transitions.",
    idempotent: true,
  },
  {
    name: "trg_validate_subscription_status",
    table: "subscriptions",
    event: "BEFORE UPDATE",
    description: "Validates subscription status transitions (pending→active/canceled, active→suspended/canceled/expired).",
    idempotent: true,
  },
  {
    name: "trg_log_invoice_created",
    table: "invoices",
    event: "AFTER INSERT",
    description: "Logs new invoice creation to system_event_log.",
    idempotent: true,
  },
  {
    name: "trg_log_invoice_status_change",
    table: "invoices",
    event: "AFTER UPDATE",
    description: "Logs invoice status changes to system_event_log.",
    idempotent: true,
  },
  {
    name: "trg_log_payment_status_change",
    table: "payments",
    event: "AFTER UPDATE",
    description: "Logs payment status changes to system_event_log.",
    idempotent: true,
  },
  {
    name: "trg_log_subscription_status_change",
    table: "subscriptions",
    event: "AFTER UPDATE",
    description: "Logs subscription status changes to system_event_log.",
    idempotent: true,
  },
  {
    name: "trg_log_fulfillment_event",
    table: "fulfillment",
    event: "AFTER INSERT/UPDATE",
    description: "Logs fulfillment creation and status changes (including 'sent' transitions).",
    idempotent: true,
  },
  {
    name: "invoices_updated_at",
    table: "invoices",
    event: "BEFORE UPDATE",
    description: "Auto-updates updated_at timestamp on invoice changes.",
    idempotent: true,
  },
  {
    name: "payments_updated_at",
    table: "payments",
    event: "BEFORE UPDATE",
    description: "Auto-updates updated_at timestamp on payment changes.",
    idempotent: true,
  },
  {
    name: "fulfillment_updated_at",
    table: "fulfillment",
    event: "BEFORE UPDATE",
    description: "Auto-updates updated_at timestamp on fulfillment changes.",
    idempotent: true,
  },
];

const EDGE_FUNCTIONS_REGISTRY = [
  {
    name: "purchase-subscriptions",
    description: "Creates subscription, invoice, payment record, and NOWPayments crypto checkout. Sends invoice email.",
    auth: "JWT required",
    logs_events: true,
  },
  {
    name: "nowpayments-webhook",
    description: "Receives IPN from NOWPayments. Updates payment status/tx_hash. Voids invoice on failure. Logs events.",
    auth: "No JWT (webhook)",
    logs_events: true,
  },
  {
    name: "send-invoice-email",
    description: "Sends branded emails via Resend: invoice_created, payment_confirmed, credentials_sent.",
    auth: "No JWT",
    logs_events: true,
  },
  {
    name: "trial-create",
    description: "Creates trial order, updates profile with trial info, creates subscription record.",
    auth: "JWT required + rate limited",
    logs_events: true,
  },
  {
    name: "delete-all-invoices",
    description: "Admin utility to bulk-delete invoices.",
    auth: "JWT required",
    logs_events: false,
  },
  {
    name: "simulate-payment",
    description: "Admin-only test mode: simulates confirmed payment, marks invoice paid, triggers fulfillment. Logs events.",
    auth: "JWT + admin role check",
    logs_events: true,
  },
];

const GUARDRAILS_REGISTRY = [
  {
    name: "idx_fulfillment_unique_invoice",
    type: "Unique Index",
    description: "Prevents duplicate fulfillment records per invoice (WHERE status != 'cancelled').",
  },
  {
    name: "idx_payments_unique_pending_invoice",
    type: "Unique Index",
    description: "Prevents duplicate pending payments per invoice.",
  },
  {
    name: "validate_invoice_status_transition",
    type: "Validation Trigger",
    description: "Enforces valid invoice status transitions: unpaid→paid/void, paid→void.",
  },
  {
    name: "validate_payment_status_transition",
    type: "Validation Trigger",
    description: "Enforces valid payment status transitions: pending→confirmed/failed.",
  },
  {
    name: "validate_subscription_status_transition",
    type: "Validation Trigger",
    description: "Enforces valid subscription status transitions.",
  },
];

interface EventLogEntry {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  status: string;
  error_message: string | null;
  created_at: string;
  actor_id: string | null;
}

const SystemAudit = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedSections, setExpandedSections] = useState({
    triggers: true,
    functions: true,
    guardrails: true,
    eventLog: true,
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/dashboard/profile");
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) loadEventLog();
  }, [isAdmin]);

  const loadEventLog = async () => {
    setLoadingLog(true);
    try {
      const { data, error } = await supabase
        .from("system_event_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setEventLog((data as EventLogEntry[]) || []);
    } catch (err) {
      console.error("Failed to load event log:", err);
      toast({ title: "Error", description: "Failed to load system event log.", variant: "destructive" });
    } finally {
      setLoadingLog(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Derive event types from log for filter
  const eventTypes = [...new Set(eventLog.map((e) => e.event_type))].sort();

  // Filter event log
  const filteredLog = eventLog.filter((e) => {
    if (typeFilter !== "all" && e.event_type !== typeFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        e.event_type.toLowerCase().includes(s) ||
        e.entity_type.toLowerCase().includes(s) ||
        e.entity_id.toLowerCase().includes(s) ||
        e.error_message?.toLowerCase().includes(s) ||
        JSON.stringify(e.metadata).toLowerCase().includes(s)
      );
    }
    return true;
  });

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            System Audit
          </h1>
          <p className="text-muted-foreground">
            Triggers, edge functions, guardrails, and system event log
          </p>
        </div>
        <Button variant="outline" onClick={loadEventLog} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Log
        </Button>
      </div>

      {/* Triggers Registry */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("triggers")}
        >
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-blue-400" />
            Database Triggers ({TRIGGERS_REGISTRY.length})
            {expandedSections.triggers ? (
              <ChevronDown className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronRight className="h-4 w-4 ml-auto" />
            )}
          </CardTitle>
          <CardDescription>All active triggers on public tables</CardDescription>
        </CardHeader>
        {expandedSections.triggers && (
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="h-9">Name</TableHead>
                    <TableHead className="h-9">Table</TableHead>
                    <TableHead className="h-9">Event</TableHead>
                    <TableHead className="h-9">Description</TableHead>
                    <TableHead className="h-9">Idempotent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TRIGGERS_REGISTRY.map((t) => (
                    <TableRow key={t.name} className="text-sm">
                      <TableCell className="font-mono text-xs">{t.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{t.table}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{t.event}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px]">{t.description}</TableCell>
                      <TableCell>
                        {t.idempotent ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Edge Functions Registry */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("functions")}
        >
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-yellow-400" />
            Edge Functions ({EDGE_FUNCTIONS_REGISTRY.length})
            {expandedSections.functions ? (
              <ChevronDown className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronRight className="h-4 w-4 ml-auto" />
            )}
          </CardTitle>
          <CardDescription>Backend functions and webhook handlers</CardDescription>
        </CardHeader>
        {expandedSections.functions && (
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="h-9">Function</TableHead>
                    <TableHead className="h-9">Description</TableHead>
                    <TableHead className="h-9">Auth</TableHead>
                    <TableHead className="h-9">Logs Events</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {EDGE_FUNCTIONS_REGISTRY.map((f) => (
                    <TableRow key={f.name} className="text-sm">
                      <TableCell className="font-mono text-xs">{f.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px]">{f.description}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            f.auth.includes("JWT") || f.auth.includes("HMAC")
                              ? "border-green-500/30 text-green-400"
                              : "border-yellow-500/30 text-yellow-400"
                          }`}
                        >
                          {f.auth}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {f.logs_events ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">No</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Guardrails Registry */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("guardrails")}
        >
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-green-400" />
            Guardrails ({GUARDRAILS_REGISTRY.length})
            {expandedSections.guardrails ? (
              <ChevronDown className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronRight className="h-4 w-4 ml-auto" />
            )}
          </CardTitle>
          <CardDescription>Unique constraints and validation rules preventing data corruption</CardDescription>
        </CardHeader>
        {expandedSections.guardrails && (
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="h-9">Name</TableHead>
                    <TableHead className="h-9">Type</TableHead>
                    <TableHead className="h-9">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {GUARDRAILS_REGISTRY.map((g) => (
                    <TableRow key={g.name} className="text-sm">
                      <TableCell className="font-mono text-xs">{g.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{g.type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[400px]">{g.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* System Event Log */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("eventLog")}
        >
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-purple-400" />
            System Event Log
            {eventLog.length > 0 && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 ml-2">
                {eventLog.length}
              </Badge>
            )}
            {expandedSections.eventLog ? (
              <ChevronDown className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronRight className="h-4 w-4 ml-auto" />
            )}
          </CardTitle>
          <CardDescription>Last 200 system events (invoices, payments, fulfillment, webhooks)</CardDescription>
        </CardHeader>
        {expandedSections.eventLog && (
          <CardContent className="pt-0 space-y-3">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Event Types</SelectItem>
                  {eventTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="fail">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingLog ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No events recorded yet.</p>
                <p className="text-xs">Events will appear here as the system processes orders, payments, and fulfillment.</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="h-9 px-2">Time</TableHead>
                        <TableHead className="h-9 px-2">Event</TableHead>
                        <TableHead className="h-9 px-2">Entity</TableHead>
                        <TableHead className="h-9 px-2">Status</TableHead>
                        <TableHead className="h-9 px-2">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLog.map((e) => (
                        <TableRow key={e.id} className="text-xs">
                          <TableCell className="px-2 py-1.5 whitespace-nowrap">
                            <div>
                              <p className="text-[11px]">{format(new Date(e.created_at), "MMM d HH:mm:ss")}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 ${
                                e.event_type.includes("confirmed") || e.event_type.includes("paid") || e.event_type.includes("sent") || e.event_type.includes("activated")
                                  ? "border-green-500/30 text-green-400"
                                  : e.event_type.includes("failed") || e.event_type.includes("voided")
                                  ? "border-red-500/30 text-red-400"
                                  : e.event_type.includes("created") || e.event_type.includes("moved")
                                  ? "border-blue-500/30 text-blue-400"
                                  : "border-muted"
                              }`}
                            >
                              {e.event_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-2 py-1.5">
                            <div>
                              <span className="text-muted-foreground">{e.entity_type}/</span>
                              <span className="font-mono text-[10px]">{e.entity_id.slice(0, 8)}…</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-1.5">
                            {e.status === "success" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-red-400" />
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 max-w-[300px]">
                            {e.error_message ? (
                              <span className="text-red-400 text-[10px]">{e.error_message}</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground truncate block max-w-[300px]">
                                {JSON.stringify(e.metadata).slice(0, 120)}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default SystemAudit;
