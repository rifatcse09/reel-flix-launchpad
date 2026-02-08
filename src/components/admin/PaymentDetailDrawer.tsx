import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, FileText, CreditCard, History, MessageSquare, Send } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { getInvoiceStatusBadge, getPaymentStatusBadge } from "./StatusBadges";
import type { InvoiceItem } from "./PaymentQueueTable";

interface AdminNote {
  id: string;
  content: string;
  admin_name: string | null;
  created_at: string;
}

interface SubscriptionRecord {
  id: string;
  plan: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  ends_at: string | null;
}

interface PaymentDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  item: InvoiceItem | null;
}

const PaymentDetailDrawer = ({ open, onClose, item }: PaymentDetailDrawerProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    created_at: string;
  } | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    if (open && item) {
      loadDrawerData();
    }
    if (!open) {
      setNotes([]);
      setSubscriptions([]);
      setProfile(null);
      setNewNote("");
    }
  }, [open, item?.id]);

  const loadDrawerData = async () => {
    if (!item) return;
    setLoadingData(true);
    try {
      const [profileRes, subsRes, notesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, email, phone, country, created_at")
          .eq("id", item.user_id)
          .single(),
        supabase
          .from("subscriptions")
          .select("id, plan, status, amount_cents, currency, created_at, ends_at")
          .eq("user_id", item.user_id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("admin_notes")
          .select("id, content, admin_name, created_at")
          .eq("entity_type", "invoice")
          .eq("entity_id", item.id)
          .order("created_at", { ascending: false }),
      ]);

      setProfile(profileRes.data);
      setSubscriptions(subsRes.data || []);
      setNotes(notesRes.data || []);
    } catch (error) {
      console.error("Error loading drawer data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !item) return;
    setSubmittingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id || "")
        .single();

      const { error } = await supabase.from("admin_notes").insert({
        entity_type: "invoice",
        entity_id: item.id,
        admin_id: user?.id || "",
        admin_name: adminProfile?.full_name || user?.email || "Admin",
        content: newNote.trim(),
      });

      if (error) throw error;

      setNewNote("");
      // Reload notes
      const { data: refreshed } = await supabase
        .from("admin_notes")
        .select("id, content, admin_name, created_at")
        .eq("entity_type", "invoice")
        .eq("entity_id", item.id)
        .order("created_at", { ascending: false });
      setNotes(refreshed || []);

      toast({ title: "Note added" });
    } catch (error) {
      console.error("Error adding note:", error);
      toast({ title: "Error", description: "Failed to add note.", variant: "destructive" });
    } finally {
      setSubmittingNote(false);
    }
  };

  const payment = item?.payments[0];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {item?.invoice_number || "Invoice Details"}
          </SheetTitle>
          <SheetDescription>
            {item?.profiles?.full_name || item?.profiles?.email || "Customer"}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="px-6 pb-6 space-y-5">
            {loadingData ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {/* Customer Info */}
                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Customer
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{profile?.full_name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium text-xs">{profile?.email || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">{profile?.phone || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Country</span>
                      <span className="font-medium">{profile?.country || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Joined</span>
                      <span className="font-medium">
                        {profile?.created_at ? format(new Date(profile.created_at), "MMM d, yyyy") : "—"}
                      </span>
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Invoice Details */}
                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Invoice
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      {item && getInvoiceStatusBadge(item.status, item.notes?.includes("[FLAGGED]"))}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan</span>
                      <Badge variant="outline" className="text-xs">{item?.plan_name || "—"}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-bold">${((item?.amount_cents ?? 0) / 100).toFixed(2)} {item?.currency}</span>
                    </div>
                    {(item?.discount_cents ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="text-green-400">-${((item?.discount_cents ?? 0) / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{item?.created_at ? format(new Date(item.created_at), "MMM d, yyyy HH:mm") : "—"}</span>
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Payment / Transaction Data */}
                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Payment
                  </h4>
                  {payment ? (
                    <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        {getPaymentStatusBadge(payment.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Method</span>
                        <span className="capitalize">{payment.method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Provider</span>
                        <span className="capitalize">{payment.provider || "—"}</span>
                      </div>
                      {payment.chain && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Chain</span>
                          <Badge variant="secondary" className="text-xs">{payment.chain}</Badge>
                        </div>
                      )}
                      {payment.amount_received_cents && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Received</span>
                          <span className="font-medium">${(payment.amount_received_cents / 100).toFixed(2)}</span>
                        </div>
                      )}
                      {payment.tx_hash && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">TX Hash</span>
                          <span className="font-mono text-xs truncate max-w-[180px]" title={payment.tx_hash}>
                            {payment.tx_hash}
                          </span>
                        </div>
                      )}
                      {payment.from_address && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">From</span>
                          <span className="font-mono text-xs truncate max-w-[180px]" title={payment.from_address}>
                            {payment.from_address}
                          </span>
                        </div>
                      )}
                      {payment.to_address && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">To</span>
                          <span className="font-mono text-xs truncate max-w-[180px]" title={payment.to_address}>
                            {payment.to_address}
                          </span>
                        </div>
                      )}
                      {payment.processor_payment_id && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Processor ID</span>
                          <span className="font-mono text-xs">{payment.processor_payment_id}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">No payment record found.</p>
                  )}
                </section>

                <Separator />

                {/* Subscription History */}
                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" /> Subscription History
                  </h4>
                  {subscriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">No subscriptions found.</p>
                  ) : (
                    <div className="space-y-2">
                      {subscriptions.map((sub) => (
                        <div key={sub.id} className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{sub.plan}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                sub.status === "active"
                                  ? "border-green-500/30 text-green-400"
                                  : "border-muted text-muted-foreground"
                              }`}
                            >
                              {sub.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>${(sub.amount_cents / 100).toFixed(2)} {sub.currency}</span>
                            <span>{format(new Date(sub.created_at), "MMM d, yyyy")}</span>
                          </div>
                          {sub.ends_at && (
                            <p className="text-xs text-muted-foreground">
                              Expires: {format(new Date(sub.ends_at), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <Separator />

                {/* Internal Notes */}
                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Internal Notes
                  </h4>

                  {/* Add note */}
                  <div className="flex gap-2 mb-3">
                    <Textarea
                      placeholder="Add internal note…"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                      className="text-sm resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          handleAddNote();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="self-end h-8 px-2"
                      onClick={handleAddNote}
                      disabled={submittingNote || !newNote.trim()}
                    >
                      {submittingNote ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Notes list */}
                  {notes.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No notes yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {notes.map((note) => (
                        <div key={note.id} className="bg-muted/30 rounded-lg p-2.5 text-sm">
                          <p className="whitespace-pre-wrap">{note.content}</p>
                          <div className="flex justify-between items-center mt-1.5">
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {note.admin_name || "Admin"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default PaymentDetailDrawer;
