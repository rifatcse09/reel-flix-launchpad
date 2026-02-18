import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  device_count: number;
  billing_cycle: string;
  price_usd: number;
  active: boolean;
}

const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: "Monthly",
  six_month: "6 Months",
  yearly: "Yearly",
  lifetime: "Lifetime",
};

const PLAN_DISPLAY_ORDER = [
  { name: "Basic", billing_cycle: "monthly", highlighted: false },
  { name: "Family Plan", billing_cycle: "yearly", highlighted: true },
  { name: "Platinum Plan", billing_cycle: "six_month", highlighted: false },
  { name: "Unlimited", billing_cycle: "lifetime", highlighted: false, isUnlimited: true },
];

const Subscriptions = () => {
  const [referralCode, setReferralCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [codeData, setCodeData] = useState<any>(null);

  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevices, setSelectedDevices] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Fetch from centralized subscription_plans table
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("active", true)
          .order("billing_cycle")
          .order("device_count");

        if (error) throw error;

        if (data) {
          setPlans(data as SubscriptionPlan[]);
          // Initialize device selectors with middle option
          const initial: Record<string, string> = {};
          PLAN_DISPLAY_ORDER.forEach(({ name, billing_cycle, isUnlimited }) => {
            if (isUnlimited) return;
            const group = data.filter(
              (p) => p.plan_name === name && p.billing_cycle === billing_cycle
            );
            if (group.length > 0) {
              const mid = group[Math.floor(group.length / 2)];
              initial[`${name}-${billing_cycle}`] = mid.device_count.toString();
            }
          });
          setSelectedDevices(initial);
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
        toast({
          title: "Error",
          description: "Failed to load subscription plans",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [toast]);

  // Check for referral code in localStorage
  useEffect(() => {
    const storedCode = localStorage.getItem("ref_code");
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
        .from("referral_codes")
        .select("id, active, expires_at, max_uses, discount_amount_cents, trial_hours, discount_type")
        .eq("code", uppercaseCode)
        .maybeSingle();

      if (error) throw error;
      if (!data) { setCodeValid(false); setCodeData(null); return; }
      if (!data.active) {
        setCodeValid(false); setCodeData(null);
        toast({ title: "Invalid Code", description: "This referral code is not active", variant: "destructive" });
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCodeValid(false); setCodeData(null);
        toast({ title: "Expired Code", description: "This referral code has expired", variant: "destructive" });
        return;
      }
      if (data.max_uses) {
        const { count } = await supabase
          .from("referral_uses")
          .select("*", { count: "exact", head: true })
          .eq("code_id", data.id);
        if (count !== null && count >= data.max_uses) {
          setCodeValid(false); setCodeData(null);
          toast({ title: "Code Limit Reached", description: "This referral code has reached its usage limit", variant: "destructive" });
          return;
        }
      }
      setCodeValid(true);
      setCodeData(data);
      const benefits = [];
      if (data.discount_type === "trial" || data.discount_type === "both") benefits.push(`${data.trial_hours}h free trial`);
      if (data.discount_type === "discount" || data.discount_type === "both") benefits.push(`$${(data.discount_amount_cents / 100).toFixed(0)} off yearly plan`);
      toast({ title: "Valid Code!", description: `Benefits: ${benefits.join(" + ")}` });
    } catch (error) {
      console.error("Error validating code:", error);
      setCodeValid(false);
      setCodeData(null);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleCheckout = async (plan: SubscriptionPlan) => {
    setProcessingPlanId(plan.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Authentication Required", description: "Please log in to subscribe", variant: "destructive" });
        setProcessingPlanId(null);
        return;
      }

      const { data: response, error: purchaseError } = await supabase.functions.invoke(
        "purchase-subscriptions",
        {
          body: {
            subscription_plan_id: plan.id,    // Use new centralized plan ID
            referral_code: codeValid && referralCode ? referralCode.toUpperCase() : null,
          },
        }
      );

      if (purchaseError || !response?.ok) {
        toast({
          title: "Unable to Process Subscription",
          description: response?.error || "We're experiencing technical difficulties. Please try again or contact support.",
          variant: "destructive",
        });
        setProcessingPlanId(null);
        return;
      }

      if (response.pay_url) {
        localStorage.removeItem("ref_code");
        localStorage.removeItem("referral_session_id");
        window.location.href = response.pay_url;
      } else {
        toast({
          title: "Order Created",
          description: "Your order has been created. Please check your Transactions page for payment details, or contact support.",
        });
        setProcessingPlanId(null);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Something Went Wrong",
        description: "We couldn't process your request. Please try again or contact support.",
        variant: "destructive",
      });
      setProcessingPlanId(null);
    }
  };

  const getGroup = (name: string, billing_cycle: string) =>
    plans.filter((p) => p.plan_name === name && p.billing_cycle === billing_cycle);

  const getCurrentPlan = (name: string, billing_cycle: string): SubscriptionPlan | undefined => {
    const key = `${name}-${billing_cycle}`;
    const group = getGroup(name, billing_cycle);
    const deviceStr = selectedDevices[key];
    return (deviceStr ? group.find((p) => p.device_count === parseInt(deviceStr)) : undefined) ?? group[0];
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
              <ul className="space-y-2 text-sm text-left max-w-md mx-auto">
                {(codeData.discount_type === "trial" || codeData.discount_type === "both") && (
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" />
                    <span>{codeData.trial_hours} hours free trial</span>
                  </li>
                )}
                {(codeData.discount_type === "discount" || codeData.discount_type === "both") && (
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
                        setReferralCode(e.target.value.toUpperCase());
                        setCodeValid(null);
                        setCodeData(null);
                      }}
                      placeholder="Enter code"
                      className="uppercase"
                    />
                    {codeValid !== null && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {codeValid ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-destructive" />}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="cta"
                  onClick={() => validateReferralCode(referralCode)}
                  disabled={!referralCode.trim() || validatingCode}
                >
                  {validatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
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
          {PLAN_DISPLAY_ORDER.map(({ name, billing_cycle, highlighted, isUnlimited }) => {
            const group = getGroup(name, billing_cycle);
            if (group.length === 0) return null;

            const key = `${name}-${billing_cycle}`;
            const currentPlan = getCurrentPlan(name, billing_cycle);
            if (!currentPlan) return null;

            const isYearly = billing_cycle === "yearly";
            const hasDiscount = codeValid && codeData && isYearly &&
              (codeData.discount_type === "discount" || codeData.discount_type === "both");
            const discountedPrice = hasDiscount
              ? currentPlan.price_usd - codeData.discount_amount_cents / 100
              : currentPlan.price_usd;

            const hasTrial = codeValid && codeData &&
              (codeData.discount_type === "trial" || codeData.discount_type === "both");

            const isProcessing = processingPlanId === currentPlan.id;

            return (
              <Card
                key={key}
                className={`relative overflow-hidden flex flex-col ${
                  isUnlimited
                    ? "border-2 border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.4)] bg-gradient-to-b from-yellow-500/10 to-transparent"
                    : highlighted
                    ? "border-accent shadow-[0_0_30px_rgba(255,20,147,0.3)]"
                    : ""
                }`}
              >
                {isUnlimited ? (
                  <Badge className="absolute top-4 right-4 bg-yellow-500 text-black hover:bg-yellow-400 font-bold">BEST VALUE</Badge>
                ) : highlighted ? (
                  <Badge className="absolute top-4 right-4 bg-accent text-white hover:bg-accent">Popular</Badge>
                ) : null}

                <CardHeader>
                  <CardTitle className={`text-2xl ${isUnlimited ? "text-yellow-500" : ""}`}>{name}</CardTitle>
                  <CardDescription>
                    {isUnlimited ? "Pay Once, Forever Access" : BILLING_CYCLE_LABELS[billing_cycle]}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-grow space-y-4">
                  {/* Device Selector */}
                  {group.length > 1 && !isUnlimited && (
                    <div className="space-y-2">
                      <Label>Number of Devices</Label>
                      <Select
                        value={selectedDevices[key] ?? group[0].device_count.toString()}
                        onValueChange={(val) =>
                          setSelectedDevices((prev) => ({ ...prev, [key]: val }))
                        }
                      >
                        <SelectTrigger className="focus:ring-accent focus:border-accent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {group.map((p) => (
                            <SelectItem key={p.id} value={p.device_count.toString()}>
                              {p.device_count} device{p.device_count > 1 ? "s" : ""} — ${p.price_usd.toFixed(0)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {isUnlimited && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-sm text-yellow-500 font-semibold">{currentPlan.device_count} devices included</p>
                    </div>
                  )}

                  {/* Price */}
                  <div>
                    {hasDiscount ? (
                      <div className="space-y-1">
                        <span className="text-2xl font-bold line-through text-muted-foreground">
                          ${currentPlan.price_usd.toFixed(0)}
                        </span>
                        <span className="text-5xl font-bold text-accent block">
                          ${discountedPrice.toFixed(0)}
                        </span>
                      </div>
                    ) : (
                      <span className={`text-5xl font-bold ${isUnlimited ? "text-yellow-500" : "text-foreground"}`}>
                        ${currentPlan.price_usd.toFixed(0)}
                      </span>
                    )}
                    {isUnlimited && <p className="text-sm text-muted-foreground mt-1">One-time payment</p>}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 text-sm">
                    {hasTrial && (
                      <li className="flex items-start gap-2 text-accent font-semibold">
                        <Check className="h-4 w-4 mt-0.5" />
                        <span>{codeData.trial_hours}h FREE Trial First!</span>
                      </li>
                    )}
                    {isUnlimited && (
                      <li className="flex items-start gap-2 text-yellow-500 font-semibold">
                        <span>📦</span>
                        <span>FREE H96 Max M9 Android Box Included!</span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span>🕒</span>
                      <span>{isUnlimited ? "Forever" : BILLING_CYCLE_LABELS[billing_cycle]}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>📱</span>
                      <span>{currentPlan.device_count} device{currentPlan.device_count > 1 ? "s" : ""}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>🎬</span>
                      <span>10,000+ 4K and HD channels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>📺</span>
                      <span>Video On Demand</span>
                    </li>
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    variant={isUnlimited ? "default" : highlighted ? "cta" : "outline"}
                    className={`w-full ${isUnlimited ? "bg-yellow-500 hover:bg-yellow-400 text-black font-bold" : ""}`}
                    onClick={() => handleCheckout(currentPlan)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
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
    </div>
  );
};

export default Subscriptions;
