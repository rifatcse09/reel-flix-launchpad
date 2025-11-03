import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const invoiceId = searchParams.get("invoice");
  const success = searchParams.get("success");
  
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      toast({
        title: "Error",
        description: "No invoice ID provided",
        variant: "destructive",
      });
      navigate("/dashboard/subscriptions");
      return;
    }

    loadInvoiceData();
  }, [invoiceId]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke("payment-page", {
        body: { invoice_id: invoiceId },
      });

      if (error) throw error;

      setInvoice(data.invoice);
      setCheckoutUrl(data.checkout_url);
    } catch (error) {
      console.error("Error loading invoice:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>
              Your payment has been processed successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Your subscription will be activated shortly.
            </p>
            <Button onClick={() => navigate("/dashboard/subscriptions")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invoice Not Found</CardTitle>
            <CardDescription>
              Unable to load invoice details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard/subscriptions")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-primary/10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Payment</CardTitle>
          <CardDescription>
            ReelFlix Subscription Invoice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Invoice #</span>
              <span className="text-sm">{invoiceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Status</span>
              <span className="text-sm">{invoice.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Due Date</span>
              <span className="text-sm">{invoice.duedate}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-bold">Total Amount</span>
              <span className="font-bold text-lg">${invoice.total}</span>
            </div>
          </div>

          {invoice.status === "Paid" ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                This invoice has already been paid.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Click below to pay securely with Stripe. No account required.
              </p>
              <Button 
                onClick={handlePayment} 
                className="w-full" 
                size="lg"
                disabled={!checkoutUrl}
              >
                {checkoutUrl ? `Pay $${invoice.total} with Stripe` : "Loading..."}
              </Button>
            </>
          )}

          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard/subscriptions")} 
            className="w-full"
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
