import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
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

const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: "Price monthly*",
  six_month: "Price for 6 months*",
  yearly: "Price annual*",
  lifetime: "One-time payment",
};

const BILLING_CYCLE_ORDER = ["monthly", "six_month", "yearly", "lifetime"];

const PLAN_DISPLAY = [
  {
    name: "Basic",
    billing_cycle: "monthly",
    highlighted: false,
    description: "30 Days — Dive into a world of convenience and discovery with our Basic Subscription Package, 30 days to explore",
  },
  {
    name: "Family Plan",
    billing_cycle: "yearly",
    highlighted: true,
    description: "365 Days — Experience excellence with our Family Plan Subscription Package, tailored for discerning entertainment enthusiasts.",
  },
  {
    name: "Platinum Plan",
    billing_cycle: "six_month",
    highlighted: false,
    description: "180 Days — Elevate your viewing experience with our Platinum Plan, premium-streaming-supreme within a fully inclusive, top-tier quality TV experience.",
  },
  {
    name: "Unlimited",
    billing_cycle: "lifetime",
    highlighted: false,
    isUnlimited: true,
    description: "Never pay again - lifetime access!",
  },
];

const PricingSection = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevices, setSelectedDevices] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("active", true)
        .order("billing_cycle")
        .order("device_count");

      if (!error && data) {
        setPlans(data as SubscriptionPlan[]);
        // Initialize device selectors: pick middle device option for each plan group
        const initial: Record<string, string> = {};
        PLAN_DISPLAY.forEach(({ name, billing_cycle, isUnlimited }) => {
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
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const getSelectedPlan = (name: string, billing_cycle: string): SubscriptionPlan | undefined => {
    const key = `${name}-${billing_cycle}`;
    const deviceCount = parseInt(selectedDevices[key] ?? "0");
    const group = plans.filter(
      (p) => p.plan_name === name && p.billing_cycle === billing_cycle
    );
    return group.find((p) => p.device_count === deviceCount) ?? group[0];
  };

  const getGroupForPlan = (name: string, billing_cycle: string): SubscriptionPlan[] =>
    plans.filter((p) => p.plan_name === name && p.billing_cycle === billing_cycle);

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
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Pricing and Packages
          </h2>
          <p className="text-lg text-foreground/80 mb-8">
            Ready to subscribe or renew your services? Please select from one of the packages below. Payment methods include Crypto, Cash App, Zelle... and all major credit cards and debit cards.
          </p>

          {/* Features List */}
          <div className="max-w-3xl mx-auto bg-card border border-border rounded-lg p-8 mb-12">
            <ul className="space-y-4 text-left text-lg text-foreground/90">
              {[
                "Up to 5 devices per user",
                "Over 10,000+ 4K and HD channels",
                "From US, Canada, UK, Latino, Germany, Nordic, Arabic, Israel and more",
                "All categories (Sports, Entertainment, News, Kids, etc)",
                "160 adult channels with parental controls and secure PIN access",
                "Over 20,000 commercial-free movies and TV shows on demand",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="text-accent font-bold mt-1">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            ReelFlix offers you<br />no-nonsense pricing
          </h2>
          <p className="text-lg text-foreground/80 max-w-3xl mx-auto leading-relaxed">
            Sick of being locked into long-term contracts with cable and satellite
            companies that keep asking for more and offering less? ReelFlix
            offers you no-nonsense pricing. Our clear pricing structure means
            you never need to add expensive sports or premium channel
            packages. And our customer service is dedicated to helping you watch
            the TV you love, not selling you more than you need.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {PLAN_DISPLAY.map((planMeta, index) => {
            const { name, billing_cycle, highlighted, isUnlimited, description } = planMeta;

            if (isUnlimited) {
              const lifetimePlan = plans.find(
                (p) => p.plan_name === "Unlimited" && p.billing_cycle === "lifetime"
              );
              if (!lifetimePlan) return null;

              return (
                <Card
                  key="unlimited"
                  className="relative overflow-hidden animate-fade-in flex flex-col border-2 border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.4)] bg-gradient-to-b from-yellow-500/10 to-transparent"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Badge className="absolute top-4 right-4 bg-yellow-500 text-black hover:bg-yellow-400 font-bold">
                    BEST VALUE
                  </Badge>
                  <CardHeader>
                    <CardTitle className="text-2xl text-yellow-500">Unlimited</CardTitle>
                    <CardDescription className="text-muted-foreground">One-time payment</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-sm text-yellow-500 font-semibold">{lifetimePlan.device_count} devices included</p>
                    </div>
                    <div className="mb-6">
                      <span className="text-5xl font-bold text-yellow-500">
                        ${lifetimePlan.price_usd.toFixed(0)}
                      </span>
                    </div>
                    <ul className="space-y-3">
                      <li className="text-foreground/80">Forever</li>
                      <li className="text-foreground/80">{description}</li>
                      <li className="text-yellow-500 font-semibold">FREE H96 Max M9 Android Box Included!</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                      size="lg"
                      onClick={() => navigate("/dashboard/subscriptions")}
                    >
                      Get Lifetime Access
                    </Button>
                  </CardFooter>
                </Card>
              );
            }

            const group = getGroupForPlan(name, billing_cycle);
            if (group.length === 0) return null;

            const key = `${name}-${billing_cycle}`;
            const currentDeviceStr = selectedDevices[key] ?? group[0].device_count.toString();
            const currentPlan = group.find((p) => p.device_count === parseInt(currentDeviceStr)) ?? group[0];

            return (
              <Card
                key={key}
                className={`relative overflow-hidden animate-fade-in flex flex-col ${
                  highlighted ? "border-accent shadow-[0_0_30px_rgba(255,20,147,0.3)]" : ""
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {highlighted && (
                  <Badge className="absolute top-4 right-4 bg-accent text-white hover:bg-accent">Popular</Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{name}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {BILLING_CYCLE_LABELS[billing_cycle]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  {group.length > 1 && (
                    <div className="mb-4">
                      <Select
                        value={currentDeviceStr}
                        onValueChange={(val) =>
                          setSelectedDevices((prev) => ({ ...prev, [key]: val }))
                        }
                      >
                        <SelectTrigger className="w-full bg-card border-accent focus:ring-accent focus:ring-2 focus:border-accent z-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-accent z-50">
                          {group.map((p) => (
                            <SelectItem
                              key={p.id}
                              value={p.device_count.toString()}
                              className="cursor-pointer hover:bg-accent/10"
                            >
                              {p.device_count} device{p.device_count > 1 ? "s" : ""} — ${p.price_usd.toFixed(0)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-foreground">
                      ${currentPlan.price_usd.toFixed(0)}
                    </span>
                  </div>
                  <ul className="space-y-3">
                    <li className="text-foreground/80">{description}</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    variant={highlighted ? "cta" : "outline"}
                    className="w-full"
                    size="lg"
                    onClick={() => navigate("/dashboard/subscriptions")}
                  >
                    Subscribe Now
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
