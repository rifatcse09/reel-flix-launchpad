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

const Subscriptions = () => {
  const [referralCode, setReferralCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [codeData, setCodeData] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [starterDeviceOption, setStarterDeviceOption] = useState("4");
  const [professionalDeviceOption, setProfessionalDeviceOption] = useState("4");
  const [eliteDeviceOption, setEliteDeviceOption] = useState("4");
  const { toast } = useToast();

  const starterDeviceOptions = [
    { devices: "2", price: 25 },
    { devices: "4", price: 30 },
    { devices: "6", price: 35 }
  ];
  
  const professionalDeviceOptions = [
    { devices: "2", price: 100 },
    { devices: "4", price: 120 },
    { devices: "6", price: 150 }
  ];
  
  const eliteDeviceOptions = [
    { devices: "2", price: 180 },
    { devices: "4", price: 199 },
    { devices: "6", price: 220 }
  ];

  const getStarterPrice = () => {
    const option = starterDeviceOptions.find(opt => opt.devices === starterDeviceOption);
    return option?.price || 30;
  };
  
  const getProfessionalPrice = () => {
    const option = professionalDeviceOptions.find(opt => opt.devices === professionalDeviceOption);
    return option?.price || 120;
  };
  
  const getElitePrice = () => {
    const option = eliteDeviceOptions.find(opt => opt.devices === eliteDeviceOption);
    return option?.price || 199;
  };

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: getStarterPrice(),
      priceDisplay: `$${getStarterPrice()}`,
      period: "monthly",
      duration: "30 Days",
      description: "Dive into a world of convenience and discovery with our Starter Subscription Package"
    },
    {
      id: "professional",
      name: "Professional",
      price: getProfessionalPrice(),
      priceDisplay: `$${getProfessionalPrice()}`,
      period: "6 months",
      duration: "180 Days",
      description: "Elevate your viewing experience with our Professional Subscription Package which is premium-streaming-supreme within a fully inclusive, top-tier quality TV experience",
      highlighted: true
    },
    {
      id: "elite",
      name: "Elite",
      price: getElitePrice(),
      priceDisplay: `$${getElitePrice()}`,
      period: "annual",
      duration: "365 Days",
      description: "Experience excellence with our Elite Subscription Package! Renowned for its comprehensive lineup of channels and features tailored for discerning entertainment enthusiasts"
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
          <CardDescription>Enter your referral code to unlock special benefits</CardDescription>
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
          
          {codeValid && codeData && (
            <div className="mt-4 p-4 bg-accent/10 border border-accent/20 rounded-lg">
              <p className="font-semibold text-accent mb-2">Your Benefits:</p>
              <ul className="space-y-1 text-sm">
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
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          // Calculate discounted price for annual plan
          const isAnnual = plan.id === 'elite';
          const hasDiscount = codeValid && codeData && isAnnual && 
            (codeData.discount_type === 'discount' || codeData.discount_type === 'both');
          const discountedPrice = hasDiscount 
            ? plan.price - (codeData.discount_amount_cents / 100)
            : plan.price;
          
          const hasTrial = codeValid && codeData && 
            (codeData.discount_type === 'trial' || codeData.discount_type === 'both');

          return (
            <Card 
              key={plan.id}
              className={`relative overflow-hidden flex flex-col ${
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
              <CardContent className="flex-grow">
                {plan.id === "starter" && (
                  <div className="mb-4">
                    <Select value={starterDeviceOption} onValueChange={setStarterDeviceOption}>
                      <SelectTrigger className="w-full bg-card border-accent focus:ring-accent focus:ring-2 focus:border-accent z-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-accent z-50">
                        {starterDeviceOptions.map((option) => (
                          <SelectItem 
                            key={option.devices} 
                            value={option.devices}
                            className="cursor-pointer hover:bg-accent/10"
                          >
                            {option.devices} devices, ${option.price} a month
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {plan.id === "professional" && (
                  <div className="mb-4">
                    <Select value={professionalDeviceOption} onValueChange={setProfessionalDeviceOption}>
                      <SelectTrigger className="w-full bg-card border-accent focus:ring-accent focus:ring-2 focus:border-accent z-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-accent z-50">
                        {professionalDeviceOptions.map((option) => (
                          <SelectItem 
                            key={option.devices} 
                            value={option.devices}
                            className="cursor-pointer hover:bg-accent/10"
                          >
                            {option.devices} devices, ${option.price} for 6 months
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {plan.id === "elite" && (
                  <div className="mb-4">
                    <Select value={eliteDeviceOption} onValueChange={setEliteDeviceOption}>
                      <SelectTrigger className="w-full bg-card border-accent focus:ring-accent focus:ring-2 focus:border-accent z-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-accent z-50">
                        {eliteDeviceOptions.map((option) => (
                          <SelectItem 
                            key={option.devices} 
                            value={option.devices}
                            className="cursor-pointer hover:bg-accent/10"
                          >
                            {option.devices} devices, ${option.price} for 1 year
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="mb-6">
                  {hasDiscount ? (
                    <div className="space-y-1">
                      <span className="text-2xl font-bold line-through text-muted-foreground">
                        {plan.priceDisplay}
                      </span>
                      <span className="text-5xl font-bold text-accent block">
                        ${discountedPrice}
                      </span>
                    </div>
                  ) : (
                    <span className="text-5xl font-bold">{plan.priceDisplay}</span>
                  )}
                </div>
                <ul className="space-y-3 text-sm">
                  {hasTrial && (
                    <li className="flex items-start gap-2 text-accent font-semibold">
                      <Check className="h-4 w-4 mt-0.5" />
                      <span>{codeData.trial_hours}h FREE Trial First!</span>
                    </li>
                  )}
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
          );
        })}
      </div>
    </div>
  );
};

export default Subscriptions;