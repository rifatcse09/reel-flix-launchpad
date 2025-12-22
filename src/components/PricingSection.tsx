import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const PricingSection = () => {
  const navigate = useNavigate();
  const [starterDeviceOption, setStarterDeviceOption] = useState("4");
  const [professionalDeviceOption, setProfessionalDeviceOption] = useState("4");
  const [familyDeviceOption, setFamilyDeviceOption] = useState("4");
  
  const starterDeviceOptions = [
    { devices: "2", price: "$25" },
    { devices: "4", price: "$30" },
    { devices: "6", price: "$35" }
  ];
  
  const professionalDeviceOptions = [
    { devices: "2", price: "$100" },
    { devices: "4", price: "$120" },
    { devices: "6", price: "$150" }
  ];
  
  const familyDeviceOptions = [
    { devices: "2", price: "$180" },
    { devices: "4", price: "$200" },
    { devices: "6", price: "$220" }
  ];
  
  const getStarterPrice = () => {
    const option = starterDeviceOptions.find(opt => opt.devices === starterDeviceOption);
    return option?.price || "$30";
  };
  
  const getProfessionalPrice = () => {
    const option = professionalDeviceOptions.find(opt => opt.devices === professionalDeviceOption);
    return option?.price || "$120";
  };
  
  const getFamilyPrice = () => {
    const option = familyDeviceOptions.find(opt => opt.devices === familyDeviceOption);
    return option?.price || "$200";
  };
  
  const plans = [
    {
      name: "Basic",
      price: getStarterPrice(),
      period: "Price monthly*",
      features: [
        "30 Days",
        "Dive into a world of convenience and discovery with our Basic Subscription Package, 30 days to explore"
      ],
      highlighted: false
    },
    {
      name: "Family Plan",
      price: getFamilyPrice(),
      period: "Price annual*",
      features: [
        "365 Days",
        "Experience excellence with our Family Plan Subscription Package! Renowned for its comprehensive lineup of channels and features tailored for discerning entertainment enthusiasts, the Family Plan Subscription Package"
      ],
      highlighted: true
    },
    {
      name: "Platinum Plan",
      price: getProfessionalPrice(),
      period: "Price for 6 months*",
      features: [
        "180 Days",
        "Elevate your viewing experience with our Platinum Plan Subscription Package which is premium-streaming-supreme within a fully inclusive, top-tier quality TV experience"
      ],
      highlighted: false
    },
    {
      name: "Unlimited",
      price: "$500",
      period: "One-time payment",
      features: [
        "Forever",
        "Never pay again - lifetime access!",
        "FREE H96 Max M9 Android Box Included!"
      ],
      highlighted: false,
      isUnlimited: true
    }
  ];

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
              <li className="flex items-start gap-3">
                <span className="text-accent font-bold mt-1">•</span>
                <span>Up to 6 devices per user</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent font-bold mt-1">•</span>
                <span>Over 10,000+ 4K and HD channels</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent font-bold mt-1">•</span>
                <span>From US, Canada, UK, Latino, Germany, Nordic, Arabic, Israel and more</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent font-bold mt-1">•</span>
                <span>All categories (Sports, Entertainment, News, Kids, etc)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent font-bold mt-1">•</span>
                <span>160 adult channels with parental controls and secure PIN access</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent font-bold mt-1">•</span>
                <span>Over 20,000 commercial-free movies and TV shows on demand</span>
              </li>
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
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative overflow-hidden animate-fade-in flex flex-col ${
                (plan as any).isUnlimited 
                  ? 'border-2 border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.4)] bg-gradient-to-b from-yellow-500/10 to-transparent' 
                  : plan.highlighted 
                    ? 'border-accent shadow-[0_0_30px_rgba(255,20,147,0.3)]' 
                    : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {(plan as any).isUnlimited ? (
                <Badge className="absolute top-4 right-4 bg-yellow-500 text-black hover:bg-yellow-400 font-bold">
                  BEST VALUE
                </Badge>
              ) : plan.highlighted && (
                <Badge className="absolute top-4 right-4 bg-accent text-white hover:bg-accent">Popular</Badge>
              )}
              <CardHeader>
                <CardTitle className={`text-2xl ${(plan as any).isUnlimited ? 'text-yellow-500' : ''}`}>
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground">{plan.period}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {plan.name === "Basic" && (
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
                            {option.devices} devices, {option.price} a month
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {plan.name === "Family Plan" && (
                  <div className="mb-4">
                    <Select value={familyDeviceOption} onValueChange={setFamilyDeviceOption}>
                      <SelectTrigger className="w-full bg-card border-accent focus:ring-accent focus:ring-2 focus:border-accent z-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-accent z-50">
                        {familyDeviceOptions.map((option) => (
                          <SelectItem 
                            key={option.devices} 
                            value={option.devices}
                            className="cursor-pointer hover:bg-accent/10"
                          >
                            {option.devices} devices, {option.price} for 1 year
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {plan.name === "Platinum Plan" && (
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
                            {option.devices} devices, {option.price} for 6 months
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(plan as any).isUnlimited && (
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-sm text-yellow-500 font-semibold">6 devices included</p>
                  </div>
                )}
                <div className="mb-6">
                  <span className={`text-5xl font-bold ${(plan as any).isUnlimited ? 'text-yellow-500' : 'text-foreground'}`}>
                    {plan.price}
                  </span>
                </div>
                 <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className={`${(plan as any).isUnlimited && idx === 2 ? 'text-yellow-500 font-semibold' : 'text-foreground/80'}`}>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  variant={(plan as any).isUnlimited ? "default" : plan.highlighted ? "cta" : "outline"} 
                  className={`w-full ${(plan as any).isUnlimited ? 'bg-yellow-500 hover:bg-yellow-400 text-black font-bold' : ''}`}
                  size="lg"
                  onClick={() => navigate('/dashboard/subscriptions')}
                >
                  {(plan as any).isUnlimited ? "Get Lifetime Access" : "Subscribe Now"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
