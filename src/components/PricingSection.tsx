import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, Zap, Star, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  device_count: number;
  billing_cycle: string;
  price_usd: number;
  active: boolean;
}

const CYCLE_CONFIG = {
  monthly: {
    label: "Monthly",
    sublabel: "Pay month to month",
    icon: Zap,
    savings: null,
    duration: "30 days",
  },
  six_month: {
    label: "6 Months",
    sublabel: "Save vs monthly",
    icon: Star,
    savings: "Save up to 25%",
    duration: "180 days",
  },
  yearly: {
    label: "Yearly",
    sublabel: "Best recurring value",
    icon: Crown,
    savings: "Save up to 55%",
    duration: "365 days",
  },
};

const FEATURES = [
  "10,000+ 4K and HD channels",
  "US, Canada, UK, Latino, Arabic & more",
  "Sports, Entertainment, News, Kids",
  "20,000+ commercial-free movies & shows",
  "Parental controls & PIN access",
  "No long-term contracts",
];

function calcMonthlySavings(plan: SubscriptionPlan, monthly: SubscriptionPlan | undefined): number | null {
  if (!monthly || plan.billing_cycle === "monthly") return null;
  const months = plan.billing_cycle === "six_month" ? 6 : 12;
  const fullPrice = monthly.price_usd * months;
  const savings = fullPrice - plan.price_usd;
  return savings > 0 ? savings : null;
}

const PricingSection = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("monthly");

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("active", true)
        .order("device_count");

      if (!error && data) setPlans(data as SubscriptionPlan[]);
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const getPlansForCycle = (cycle: string) =>
    plans.filter((p) => p.billing_cycle === cycle).sort((a, b) => a.device_count - b.device_count);

  const getMonthlyEquivalent = (devices: number) =>
    plans.find((p) => p.billing_cycle === "monthly" && p.device_count === devices);

  const lifetimePlan = plans.find((p) => p.billing_cycle === "lifetime");

  if (loading) {
    return (
      <section id="pricing" className="py-24 bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </section>
    );
  }

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-accent/20 text-accent border-accent/30 hover:bg-accent/20">
            Simple Pricing
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Pricing and Packages
          </h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            No contracts. No hidden fees. Payment methods include Crypto, Cash App, Zelle,
            and all major credit and debit cards.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 text-sm text-foreground/80">
              <Check className="h-3.5 w-3.5 text-accent shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        {/* Billing Cycle Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-10">
            <TabsList className="bg-card border border-border p-1 h-auto gap-1">
              {Object.entries(CYCLE_CONFIG).map(([cycle, config]) => (
                <TabsTrigger
                  key={cycle}
                  value={cycle}
                  className="relative px-5 py-2.5 text-sm font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md transition-all"
                >
                  <span>{config.label}</span>
                  {config.savings && (
                    <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0 hover:bg-green-500/20">
                      {config.savings.split(" ").slice(0, 2).join(" ")}
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
                {/* Cycle label */}
                <div className="text-center mb-8">
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium text-foreground">{config.duration}</span> access period
                    {config.savings && (
                      <span className="ml-2 text-green-400 font-semibold">· {config.savings}</span>
                    )}
                  </p>
                </div>

                {/* Plan Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
                  {cyclePlans.map((plan, idx) => {
                    const monthlyEquiv = getMonthlyEquivalent(plan.device_count);
                    const savings = calcMonthlySavings(plan, monthlyEquiv);
                    const isMiddle = idx === Math.floor(cyclePlans.length / 2);
                    const monthlyRate = plan.billing_cycle === "six_month"
                      ? (plan.price_usd / 6).toFixed(2)
                      : plan.billing_cycle === "yearly"
                      ? (plan.price_usd / 12).toFixed(2)
                      : null;

                    return (
                      <div
                        key={plan.id}
                        className={`relative rounded-2xl border transition-all duration-200 flex flex-col
                          ${isMiddle
                            ? "border-accent shadow-[0_0_30px_rgba(255,20,147,0.25)] bg-gradient-to-b from-accent/5 to-transparent scale-[1.02]"
                            : "border-border bg-card hover:border-accent/40 hover:shadow-md"
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
                          {/* Device Count */}
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`text-2xl font-black ${isMiddle ? "text-accent" : "text-foreground"}`}>
                                {plan.device_count}
                              </div>
                              <div className="text-sm text-muted-foreground font-medium">
                                device{plan.device_count > 1 ? "s" : ""}
                              </div>
                            </div>
                            {savings && (
                              <Badge className="bg-green-500/15 text-green-400 border-green-500/25 text-[10px] px-2 py-0.5 hover:bg-green-500/15">
                                Save ${savings.toFixed(0)}
                              </Badge>
                            )}
                          </div>

                          {/* Price */}
                          <div className="mb-4">
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-bold text-foreground">
                                ${plan.price_usd.toFixed(0)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {cycle === "monthly" && "per month"}
                              {cycle === "six_month" && "for 6 months"}
                              {cycle === "yearly" && "per year"}
                            </div>
                            {monthlyRate && (
                              <div className="text-xs text-accent font-medium mt-1">
                                ≈ ${monthlyRate}/mo
                              </div>
                            )}
                          </div>

                          {/* Duration */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
                            <Check className="h-3 w-3 text-accent" />
                            <span>{config.duration} access</span>
                          </div>

                          <Button
                            size="sm"
                            variant={isMiddle ? "cta" : "outline"}
                            className="w-full mt-auto"
                            onClick={() => navigate("/dashboard/subscriptions")}
                          >
                            Subscribe Now
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

        {/* Lifetime / Unlimited Plan */}
        {lifetimePlan && (
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="relative rounded-2xl border-2 border-yellow-500/60 bg-gradient-to-br from-yellow-500/10 via-card to-card p-8 text-center shadow-[0_0_50px_rgba(234,179,8,0.2)]">
              <Badge className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-yellow-500 text-black border-0 px-4 py-1 text-sm font-bold shadow-lg">
                🏆 BEST VALUE
              </Badge>
              <div className="mb-4">
                <h3 className="text-3xl font-black text-yellow-500 mb-1">Unlimited</h3>
                <p className="text-muted-foreground">One payment. Lifetime access. Forever.</p>
              </div>
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-6xl font-black text-yellow-500">
                  ${lifetimePlan.price_usd.toFixed(0)}
                </span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-foreground/80">one-time</div>
                  <div className="text-xs text-muted-foreground">{lifetimePlan.device_count} devices</div>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mb-8">
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
                onClick={() => navigate("/dashboard/subscriptions")}
              >
                Get Lifetime Access
              </Button>
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-sm text-muted-foreground mt-12">
          All plans include access to 10,000+ 4K/HD channels and 20,000+ on-demand titles.
          Prices are in USD. Pricing controlled centrally — always accurate.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
