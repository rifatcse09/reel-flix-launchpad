import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, CreditCard, ExternalLink } from "lucide-react";

interface Plan {
  id: number;
  name: string;
  description: string;
  period: string;
  duration: string;
  highlighted: boolean;
  devices: number;
  price: number;
  display_order: number;
}

const Subscriptions = () => {
  const [referralCode, setReferralCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [codeData, setCodeData] = useState<any>(null);
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevices, setSelectedDevices] = useState<Record<string, number>>({});
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    invoiceId: string | null;
    paymentUrl: string | null;
    planName: string | null;
  }>({
    open: false,
    invoiceId: null,
    paymentUrl: null,
    planName: null,
  });
  const { toast } = useToast();

  // Fetch plans from database
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;

        if (data) {
          setPlans(data);
          
          // Initialize selected devices with highlighted option for each plan group
          const initialDevices: Record<string, number> = {};
          const uniquePlans = Array.from(new Set(data.map(p => p.name)));
          uniquePlans.forEach(planName => {
            const planGroup = data.filter(p => p.name === planName);
            // Find highlighted plan or fallback to first plan
            const highlightedPlan = planGroup.find(p => p.highlighted) || planGroup[0];
            if (highlightedPlan) {
              initialDevices[planName] = highlightedPlan.devices;
            }
          });
          setSelectedDevices(initialDevices);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        toast({
          title: "Error",
          description: "Failed to load subscription plans",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [toast]);


  // Check for referral code in localStorage
  useEffect(() => {
    const storedCode = localStorage.getItem('ref_code');
    if (storedCode) {
      setReferralCode(storedCode);
      validateReferralCode(storedCode);
    }
  }, []);

  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setCodeValid(null);
      setCodeData(null);
      return;
    }

    setValidatingCode(true);
    const uppercaseCode = code.toUpperCase();

    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('id, active, expires_at, max_uses, discount_amount_cents, trial_hours, discount_type')
        .eq('code', uppercaseCode)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setCodeValid(false);
        setCodeData(null);
        return;
      }

      if (!data.active) {
        setCodeValid(false);
        setCodeData(null);
        toast({
          title: "Invalid Code",
          description: "This referral code is not active",
          variant: "destructive"
        });
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCodeValid(false);
        setCodeData(null);
        toast({
          title: "Expired Code",
          description: "This referral code has expired",
          variant: "destructive"
        });
        return;
      }

      if (data.max_uses) {
        const { count } = await supabase
          .from('referral_uses')
          .select('*', { count: 'exact', head: true })
          .eq('code_id', data.id);

        if (count !== null && count >= data.max_uses) {
          setCodeValid(false);
          setCodeData(null);
          toast({
            title: "Code Limit Reached",
            description: "This referral code has reached its usage limit",
            variant: "destructive"
          });
          return;
        }
      }

      setCodeValid(true);
      setCodeData(data);
      
      // Build benefits message
      const benefits = [];
      if (data.discount_type === 'trial' || data.discount_type === 'both') {
        benefits.push(`${data.trial_hours}h free trial`);
      }
      if (data.discount_type === 'discount' || data.discount_type === 'both') {
        benefits.push(`$${(data.discount_amount_cents / 100).toFixed(0)} off yearly plan`);
      }
      
      toast({
        title: "Valid Code!",
        description: `Benefits: ${benefits.join(' + ')}`
      });
    } catch (error) {
      console.error('Error validating code:', error);
      setCodeValid(false);
      setCodeData(null);
    } finally {
      setValidatingCode(false);
    }
  };


  const handleCheckout = async (plan: Plan) => {
    setSelectedPlan(plan.id.toString());
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to subscribe",
          variant: "destructive"
        });
        setSelectedPlan(null);
        return;
      }

      const { data: response, error: purchaseError } = await supabase.functions.invoke('purchase-subscriptions', {
        body: { 
          plan_id: plan.id,
          referral_code: codeValid && referralCode ? referralCode.toUpperCase() : null
        }
      });

      if (purchaseError || !response) {
        toast({
          title: "Unable to Process Subscription",
          description: "We're experiencing technical difficulties. Please try again or contact support.",
          variant: "destructive"
        });
        setSelectedPlan(null);
        return;
      }

      // Redirect to crypto payment page
      if (response.pay_url) {
        localStorage.removeItem('ref_code');
        localStorage.removeItem('referral_session_id');
        window.location.href = response.pay_url;
      } else {
        // Order created but no payment URL — tell user to check transactions
        toast({
          title: "Order Created",
          description: "Your order has been created. Please check your Transactions page for payment details, or contact support.",
        });
        setSelectedPlan(null);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Something Went Wrong",
        description: "We couldn't process your request. Please try again or contact support.",
        variant: "destructive"
      });
      setSelectedPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground mt-2">Choose your plan and subscribe</p>
      </div>

      {/* Referral Code Input */}
      <Card>
        <CardHeader>
          <CardTitle>Have a Referral Code?</CardTitle>
          <CardDescription>Enter your code to unlock special benefits and discounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {codeValid && codeData ? (
            <div className="p-6 bg-accent/10 border-2 border-accent/30 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Check className="h-6 w-6 text-accent" />
                <p className="text-xl font-bold text-accent">Referral code applied successfully!</p>
              </div>
              <p className="text-muted-foreground mb-4">
                One bonus month added to your subscription
              </p>
              <ul className="space-y-2 text-sm text-left max-w-md mx-auto">
                {(codeData.discount_type === 'trial' || codeData.discount_type === 'both') && (
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" />
                    <span>{codeData.trial_hours} hours free trial</span>
                  </li>
                )}
                {(codeData.discount_type === 'discount' || codeData.discount_type === 'both') && (
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" />
                    <span>${(codeData.discount_amount_cents / 100).toFixed(0)} discount on yearly subscription</span>
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="referral-code">Referral Code</Label>
                  <div className="relative">
                    <Input
                      id="referral-code"
                      value={referralCode}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setReferralCode(value);
                        setCodeValid(null);
                        setCodeData(null);
                      }}
                      placeholder="Enter code"
                      className="uppercase"
                    />
                    {codeValid !== null && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {codeValid ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="cta"
                  onClick={() => validateReferralCode(referralCode)}
                  disabled={!referralCode.trim() || validatingCode}
                >
                  {validatingCode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Validate"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                💡 Enter your referral code for an instant discount or bonus month!
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {['Starter', 'Family Plan', 'Professional', 'Unlimited'].filter(name => 
            plans.some(p => p.name === name)
          ).map((planName) => {
            const planGroup = plans.filter(p => p.name === planName);
            if (planGroup.length === 0) return null;
            
            const defaultDevices = planGroup[0].devices;
            const currentDevices = selectedDevices[planName] ?? defaultDevices;
            const currentPlan = planGroup.find(p => p.devices === currentDevices) || planGroup[0];
            
            if (!currentPlan) return null;
            
            // Check if this is the Unlimited plan
            const isUnlimited = planName === 'Unlimited';
            
            // Calculate discounted price for annual plan
            const isAnnual = currentPlan.period === 'annual';
            const hasDiscount = codeValid && codeData && isAnnual && 
              (codeData.discount_type === 'discount' || codeData.discount_type === 'both');
            const discountedPrice = hasDiscount 
              ? currentPlan.price - (codeData.discount_amount_cents / 100)
              : currentPlan.price;
            
            const hasTrial = codeValid && codeData && 
              (codeData.discount_type === 'trial' || codeData.discount_type === 'both');

            return (
              <Card 
                key={planName}
                className={`relative overflow-hidden flex flex-col ${
                  isUnlimited 
                    ? 'border-2 border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.4)] bg-gradient-to-b from-yellow-500/10 to-transparent' 
                    : currentPlan.highlighted 
                      ? 'border-accent shadow-[0_0_30px_rgba(255,20,147,0.3)]' 
                      : ''
                }`}
              >
                {isUnlimited ? (
                  <Badge className="absolute top-4 right-4 bg-yellow-500 text-black hover:bg-yellow-400 font-bold">
                    BEST VALUE
                  </Badge>
                ) : currentPlan.highlighted && (
                  <Badge className="absolute top-4 right-4 bg-accent text-white hover:bg-accent">Popular</Badge>
                )}
                <CardHeader>
                  <CardTitle className={`text-2xl ${isUnlimited ? 'text-yellow-500' : ''}`}>
                    {currentPlan.name}
                  </CardTitle>
                  <CardDescription>
                    {isUnlimited ? 'Pay Once, Forever Access' : currentPlan.period}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-6">
                  {/* Device Selector - Only show if more than one option */}
                  {planGroup.length > 1 && (
                    <div className="space-y-2">
                      <Label htmlFor={`devices-${planName}`}>Number of Devices</Label>
                      <Select
                        value={currentDevices.toString()}
                        onValueChange={(value) => setSelectedDevices(prev => ({
                          ...prev,
                          [planName]: parseInt(value)
                        }))}
                      >
                        <SelectTrigger 
                          id={`devices-${planName}`}
                          className="focus:ring-accent focus:border-accent data-[state=open]:ring-accent data-[state=open]:border-accent"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {planGroup.map((plan) => (
                            <SelectItem key={plan.id} value={plan.devices.toString()}>
                              {plan.devices} device{plan.devices > 1 ? 's' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Price */}
                  <div>
                    {hasDiscount ? (
                      <div className="space-y-1">
                        <span className="text-2xl font-bold line-through text-muted-foreground">
                          ${currentPlan.price}
                        </span>
                        <span className="text-5xl font-bold text-accent block">
                          ${discountedPrice}
                        </span>
                      </div>
                    ) : (
                      <span className={`text-5xl font-bold ${isUnlimited ? 'text-yellow-500' : ''}`}>
                        ${currentPlan.price}
                      </span>
                    )}
                    {isUnlimited && (
                      <p className="text-sm text-muted-foreground mt-1">One-time payment</p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 text-sm">
                    {hasTrial && (
                      <li className="flex items-start gap-2 text-accent font-semibold">
                        <Check className="h-4 w-4 mt-0.5" />
                        <span>{codeData.trial_hours}h FREE Trial First!</span>
                      </li>
                    )}
                    {isUnlimited && (
                      <li className="flex items-start gap-2 text-yellow-500 font-semibold">
                        <span className="text-base">📦</span>
                        <span>FREE H96 Max M9 Android Box Included!</span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span className="text-base">🕒</span>
                      <span>{currentPlan.duration}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-base">✨</span>
                      <span className={currentPlan.highlighted || isUnlimited ? "font-semibold" : ""}>
                        {isUnlimited ? 'Never pay again - lifetime access!' : currentPlan.description}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-base">📱</span>
                      <span>{currentDevices} device{currentDevices > 1 ? 's' : ''}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-base">🎬</span>
                      <span>10,000+ 4K and HD channels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-base">📺</span>
                      <span>Video On Demand for movies and TV series</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant={isUnlimited ? "default" : currentPlan.highlighted ? "cta" : "outline"}
                    className={`w-full ${isUnlimited ? 'bg-yellow-500 hover:bg-yellow-400 text-black font-bold' : ''}`}
                    onClick={() => handleCheckout(currentPlan)}
                    disabled={selectedPlan === currentPlan.id.toString()}
                  >
                    {selectedPlan === currentPlan.id.toString() ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : isUnlimited ? (
                      "Get Lifetime Access"
                    ) : (
                      "Subscribe Now"
                    )}
                  </Button>
              </CardFooter>
            </Card>
          );
        })}
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Complete Your Payment
            </DialogTitle>
            <DialogDescription>
              Your subscription has been created successfully!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{paymentDialog.planName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice</span>
                <span className="font-medium">#{paymentDialog.invoiceId}</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              Click below to complete your payment securely with Stripe. No login required.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button 
              onClick={() => {
                if (paymentDialog.paymentUrl) {
                  window.location.href = paymentDialog.paymentUrl;
                }
              }}
              className="w-full"
              size="lg"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now with Stripe
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setPaymentDialog(prev => ({ ...prev, open: false }));
                toast({
                  title: "Payment Link Sent",
                  description: "Check your email for the payment link. You can pay anytime!",
                });
              }}
              className="w-full"
            >
              I'll Pay Later (Email Sent)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscriptions;