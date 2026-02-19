import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const CYCLE_CONFIG: Record<string, { label: string; duration: string; savings: string | null }> = {
  monthly: { label: "Monthly", duration: "30 days", savings: null },
  six_month: { label: "6 Months", duration: "180 days", savings: "Save up" },
  yearly: { label: "Yearly", duration: "365 days", savings: "Save up" },
};

const Subscriptions = () => {
  const [activeTab, setActiveTab] = useState("monthly");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const [referralCode, setReferralCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [codeData, setCodeData] = useState<any>(null);

  const { toast } = useToast();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("active", true)
          .order("device_count");
        if (error) throw error;
        if (data) setPlans(data as SubscriptionPlan[]);
      } catch {
        toast({ title: "Error", description: "Failed to load subscription plans", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [toast]);

  useEffect(() => {
    const storedCode = localStorage.getItem("ref_code");
    if (storedCode) {
      setReferralCode(storedCode);
      validateReferralCode(storedCode);
    }
  }, []);

  const validateReferralCode = async (code: string) => {
    if (!code.trim()) { setCodeValid(null); setCodeData(null); return; }
    setValidatingCode(true);
    const upper = code.toUpperCase();
    try {
      const { data, error } = await supabase
        .from("referral_codes")
        .select("id, active, expires_at, max_uses, discount_amount_cents, trial_hours, discount_type")
        .eq("code", upper)
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
    } catch {
      setCodeValid(false); setCodeData(null);
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
        { body: { subscription_plan_id: plan.id, referral_code: codeValid && referralCode ? referralCode.toUpperCase() : null } }
      );
      if (purchaseError || !response?.ok) {
        toast({ title: "Unable to Process Subscription", description: response?.error || "Please try again or contact support.", variant: "destructive" });
        setProcessingPlanId(null);
        return;
      }
      if (response.pay_url) {
        localStorage.removeItem("ref_code");
        localStorage.removeItem("referral_session_id");
        window.location.href = response.pay_url;
      } else {
        toast({ title: "Order Created", description: "Check your Transactions page for payment details." });
        setProcessingPlanId(null);
      }
    } catch {
      toast({ title: "Something Went Wrong", description: "Please try again or contact support.", variant: "destructive" });
      setProcessingPlanId(null);
    }
  };

  const getPlansForCycle = (cycle: string) =>
    plans.filter((p) => p.billing_cycle === cycle).sort((a, b) => a.device_count - b.device_count);

  const lifetimePlan = plans.find((p) => p.billing_cycle === "lifetime");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">Choose your plan and subscribe</p>
      </div>

      {/* Referral Code */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Have a Referral Code?</CardTitle>
          <CardDescription>Enter your code to unlock special benefits and discounts</CardDescription>
        </CardHeader>
        <CardContent>
          {codeValid && codeData ? (
            <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-5 w-5 text-accent" />
                <p className="font-semibold text-accent">Referral code applied!</p>
              </div>
              <ul className="space-y-1 text-sm">
                {(codeData.discount_type === "trial" || codeData.discount_type === "both") && (
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-accent" />{codeData.trial_hours} hours free trial</li>
                )}
                {(codeData.discount_type === "discount" || codeData.discount_type === "both") && (
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-accent" />${(codeData.discount_amount_cents / 100).toFixed(0)} discount on yearly subscription</li>
                )}
              </ul>
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="ref-code">Referral Code</Label>
                <div className="relative">
                  <Input
                    id="ref-code"
                    value={referralCode}
                    onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setCodeValid(null); setCodeData(null); }}
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
              <Button variant="cta" onClick={() => validateReferralCode(referralCode)} disabled={!referralCode.trim() || validatingCode}>
                {validatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Billing cycle tabs */}
            <div className="flex justify-center mb-8">
              <TabsList className="bg-card border border-border p-1 h-auto gap-1">
                {Object.entries(CYCLE_CONFIG).map(([cycle, config]) => (
                  <TabsTrigger
                    key={cycle}
                    value={cycle}
                    className="relative px-5 py-2.5 text-sm font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md transition-all"
                  >
                    {config.label}
                    {config.savings && (
                      <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0 hover:bg-green-500/20">
                        {config.savings}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {Object.entries(CYCLE_CONFIG).map(([cycle, config]) => {
              const cyclePlans = getPlansForCycle(cycle);
              return (
                <TabsContent key={cycle} value={cycle} className="mt-0">
                  <p className="text-center text-sm text-muted-foreground mb-8">
                    <span className="font-semibold text-foreground">{config.duration}</span> access period
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {cyclePlans.map((plan, idx) => {
                      const isMiddle = idx === Math.floor(cyclePlans.length / 2);
                      const isYearly = cycle === "yearly";
                      const hasDiscount = isYearly && codeValid && codeData &&
                        (codeData.discount_type === "discount" || codeData.discount_type === "both");
                      const displayPrice = hasDiscount
                        ? plan.price_usd - codeData.discount_amount_cents / 100
                        : plan.price_usd;
                      const hasTrial = codeValid && codeData &&
                        (codeData.discount_type === "trial" || codeData.discount_type === "both");
                      const isProcessing = processingPlanId === plan.id;

                      return (
                        <div
                          key={plan.id}
                          className={`relative rounded-2xl border flex flex-col transition-all duration-200
                            ${isMiddle
                              ? "border-accent shadow-[0_0_30px_rgba(255,20,147,0.25)] bg-gradient-to-b from-accent/5 to-transparent scale-[1.02]"
                              : "border-border bg-card hover:border-accent/40"
                            }`}
                        >
                          {isMiddle && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <Badge className="bg-accent text-accent-foreground border-0 shadow-md text-xs px-3 py-1">
                                Most Popular
                              </Badge>
                            </div>
                          )}

                          <div className="p-5 flex flex-col flex-grow">
                            {/* Device count */}
                            <div className="flex items-baseline gap-1.5 mb-4">
                              <span className={`text-2xl font-black ${isMiddle ? "text-accent" : "text-foreground"}`}>
                                {plan.device_count}
                              </span>
                              <span className="text-sm text-muted-foreground font-medium">
                                device{plan.device_count > 1 ? "s" : ""}
                              </span>
                            </div>

                            {/* Price */}
                            <div className="mb-4">
                              {hasDiscount ? (
                                <>
                                  <span className="text-lg font-bold line-through text-muted-foreground">${plan.price_usd.toFixed(0)}</span>
                                  <div className="text-3xl font-bold text-accent">${displayPrice.toFixed(0)}</div>
                                </>
                              ) : (
                                <div className="text-3xl font-bold text-foreground">${displayPrice.toFixed(0)}</div>
                              )}
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {cycle === "monthly" && "per month"}
                                {cycle === "six_month" && "for 6 months"}
                                {cycle === "yearly" && "per year"}
                              </div>
                            </div>

                            {/* Features */}
                            <div className="space-y-1.5 mb-5 flex-grow">
                              {hasTrial && (
                                <div className="flex items-center gap-1.5 text-xs text-accent font-semibold">
                                  <Check className="h-3 w-3" />
                                  {codeData.trial_hours}h FREE Trial First!
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Check className="h-3 w-3 text-accent" />
                                {config.duration} access
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Check className="h-3 w-3 text-accent" />
                                10,000+ 4K/HD channels
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Check className="h-3 w-3 text-accent" />
                                Video On Demand
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant={isMiddle ? "cta" : "outline"}
                              className="w-full mt-auto"
                              onClick={() => handleCheckout(plan)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Processing...</>
                              ) : "Subscribe Now"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>

          {/* Unlimited / Lifetime Plan */}
          {lifetimePlan && (
            <div className="mt-6">
              <div className="relative rounded-2xl border-2 border-yellow-500/60 bg-gradient-to-br from-yellow-500/10 via-card to-card p-8 text-center shadow-[0_0_50px_rgba(234,179,8,0.15)] max-w-2xl mx-auto">
                <Badge className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-yellow-500 text-black border-0 px-4 py-1 text-sm font-bold shadow-lg">
                  🏆 BEST VALUE
                </Badge>

                <h3 className="text-3xl font-black text-yellow-500 mb-1 mt-2">Unlimited</h3>
                <p className="text-muted-foreground mb-6">One payment. Lifetime access. Forever.</p>

                <div className="flex items-center justify-center gap-3 mb-6">
                  <span className="text-6xl font-black text-yellow-500">${lifetimePlan.price_usd.toFixed(0)}</span>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-foreground/80">one-time</div>
                    <div className="text-xs text-muted-foreground">{lifetimePlan.device_count} devices</div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-8">
                  {["Never pay again", "FREE H96 Max M9 Android Box", `${lifetimePlan.device_count} devices included`, "All features forever"].map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-sm text-foreground/80">
                      <Check className="h-4 w-4 text-yellow-500" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <Button
                  size="lg"
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-10"
                  onClick={() => handleCheckout(lifetimePlan)}
                  disabled={processingPlanId === lifetimePlan.id}
                >
                  {processingPlanId === lifetimePlan.id ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                  ) : "Get Lifetime Access"}
                </Button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            All plans include access to 10,000+ 4K/HD channels and 20,000+ on-demand titles. Prices are in USD.
          </p>
        </>
      )}
    </div>
  );
};

export default Subscriptions;
