import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X } from "lucide-react";

const Subscriptions = () => {
  const [referralCode, setReferralCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: 30,
      priceDisplay: "$30",
      period: "monthly",
      duration: "30 Days",
      description: "Dive into a world of convenience and discovery with our Starter Subscription Package"
    },
    {
      id: "elite",
      name: "Elite",
      price: 120,
      priceDisplay: "$120",
      period: "6 months",
      duration: "180 Days",
      description: "Experience excellence with our Elite Subscription Package! Comprehensive lineup of channels",
      highlighted: true
    },
    {
      id: "professional",
      name: "Professional",
      price: 199,
      priceDisplay: "$199",
      period: "annual",
      duration: "365 Days",
      description: "Elevate your viewing experience with our Professional Subscription Package"
    }
  ];

  useEffect(() => {
    // Check for referral code in localStorage
    const storedCode = localStorage.getItem('ref_code');
    if (storedCode) {
      setReferralCode(storedCode);
      validateReferralCode(storedCode);
    }
  }, []);

  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setCodeValid(null);
      return;
    }

    setValidatingCode(true);
    const uppercaseCode = code.toUpperCase();

    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('id, active, expires_at, max_uses')
        .eq('code', uppercaseCode)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setCodeValid(false);
        return;
      }

      if (!data.active) {
        setCodeValid(false);
        toast({
          title: "Invalid Code",
          description: "This referral code is not active",
          variant: "destructive"
        });
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCodeValid(false);
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
          toast({
            title: "Code Limit Reached",
            description: "This referral code has reached its usage limit",
            variant: "destructive"
          });
          return;
        }
      }

      setCodeValid(true);
      toast({
        title: "Valid Code!",
        description: "Referral code applied successfully"
      });
    } catch (error) {
      console.error('Error validating code:', error);
      setCodeValid(false);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleCheckout = async (plan: typeof plans[0]) => {
    setSelectedPlan(plan.id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to subscribe",
          variant: "destructive"
        });
        return;
      }

      // TODO: Implement Stripe checkout
      // For now, show a message
      toast({
        title: "Checkout Coming Soon",
        description: `You selected the ${plan.name} plan${referralCode && codeValid ? ` with referral code: ${referralCode}` : ''}`,
      });
      
      console.log('Checkout data:', {
        userId: user.id,
        plan: plan.name,
        price: plan.price,
        referralCode: codeValid ? referralCode : null
      });
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout process",
        variant: "destructive"
      });
    } finally {
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
          <CardDescription>Enter your referral code to get started</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id}
            className={`relative overflow-hidden ${
              plan.highlighted ? 'border-accent shadow-[0_0_30px_rgba(255,20,147,0.3)]' : ''
            }`}
          >
            {plan.highlighted && (
              <Badge className="absolute top-4 right-4">Popular</Badge>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.period}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-5xl font-bold">{plan.priceDisplay}</span>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-accent mt-0.5" />
                  <span>{plan.duration}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-accent mt-0.5" />
                  <span>{plan.description}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-accent mt-0.5" />
                  <span>Up to 3 devices</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-accent mt-0.5" />
                  <span>9,000+ HD channels</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                variant={plan.highlighted ? "default" : "outline"}
                className="w-full"
                onClick={() => handleCheckout(plan)}
                disabled={selectedPlan === plan.id}
              >
                {selectedPlan === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Subscribe Now"
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Subscriptions;