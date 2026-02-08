import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Download, DollarSign, Clock, Package } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { generateInvoicePdf } from "@/utils/invoicePdfService";
import { getInvoiceStatusBadge } from "@/components/admin/StatusBadges";

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  plan_name: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  discount_cents: number;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
  notes: string | null;
}

interface SubscriptionRecord {
  id: string;
  plan: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  ends_at: string | null;
}

const Invoices = () => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [invoicesRes, subsRes, profileRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, invoice_number, plan_name, amount_cents, currency, status, discount_cents, issued_at, due_at, paid_at, created_at, notes")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("id, plan, amount_cents, currency, status, created_at, paid_at, ends_at")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single(),
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      setInvoices(invoicesRes.data || []);
      setSubscriptions(subsRes.data || []);
      setProfile(profileRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to load your invoices", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = (invoice: InvoiceRecord) => {
    const pdf = generateInvoicePdf({
      invoiceNumber: invoice.invoice_number,
      issuedAt: invoice.issued_at || invoice.created_at,
      dueAt: invoice.due_at,
      paidAt: invoice.paid_at,
      status: invoice.status,
      customerName: profile?.full_name || "Customer",
      customerEmail: profile?.email || "",
      planName: invoice.plan_name || "ReelFlix Plan",
      amount: invoice.amount_cents / 100,
      discount: invoice.discount_cents / 100,
      currency: invoice.currency,
    });
    pdf.save(`${invoice.invoice_number}.pdf`);
  };

  const activeSub = subscriptions[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground mt-2">View your invoices and download PDFs</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Subscription Summary */}
          {activeSub && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <Package className="h-5 w-5" />
                  Active Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Plan</p>
                    <p className="text-xl font-bold">{activeSub.plan}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Renewal</p>
                    <p className="text-xl font-bold">
                      {activeSub.ends_at ? format(new Date(activeSub.ends_at), "PPP") : "Lifetime"}
                    </p>
                    {activeSub.ends_at && (() => {
                      const days = differenceInDays(new Date(activeSub.ends_at), new Date());
                      return (
                        <p className="text-xs text-muted-foreground mt-1">
                          {days <= 0 ? "Expired" : `${days} days remaining`}
                        </p>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Amount</p>
                    <p className="text-xl font-bold">
                      ${(activeSub.amount_cents / 100).toFixed(2)} {activeSub.currency}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoices List */}
          {invoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 text-6xl">📄</div>
                <h3 className="text-xl font-semibold mb-2">No invoices yet</h3>
                <p className="text-muted-foreground">
                  Once you make a purchase, your invoices will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => {
                const isFlagged = invoice.notes?.includes("[FLAGGED]") || false;
                return (
                  <Card key={invoice.id} className="overflow-hidden">
                    <CardHeader className="bg-card/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-accent" />
                            {invoice.invoice_number}
                          </CardTitle>
                          <CardDescription>
                            {invoice.plan_name || "—"} •{" "}
                            {invoice.issued_at
                              ? format(new Date(invoice.issued_at), "PPP")
                              : format(new Date(invoice.created_at), "PPP")}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getInvoiceStatusBadge(invoice.status, isFlagged)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="flex items-start gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-2xl font-bold">
                                ${(invoice.amount_cents / 100).toFixed(2)}
                              </p>
                              {invoice.discount_cents > 0 && (
                                <p className="text-xs text-green-400">
                                  Includes -${(invoice.discount_cents / 100).toFixed(2)} discount
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">{invoice.currency}</p>
                            </div>
                          </div>

                          {invoice.paid_at && (
                            <div className="flex items-start gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-green-400">Paid</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(invoice.paid_at), "PPP")}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPdf(invoice)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Invoices;
