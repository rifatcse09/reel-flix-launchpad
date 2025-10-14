import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const PricingSection = () => {
  const plans = [
    {
      name: "Starter",
      price: "$30",
      period: "Price monthly*",
      features: [
        "30 Days",
        "Dive into a world of convenience and discovery with our Starter Subscription Package, 30 days to explore"
      ],
      highlighted: false
    },
    {
      name: "Elite",
      price: "$120",
      period: "Price for 6 months*",
      features: [
        "180 Days",
        "Experience excellence with our Elite Subscription Package! Renowned for its comprehensive lineup of channels and features tailored for discerning entertainment enthusiasts, the Elite Subscription Package"
      ],
      highlighted: true
    },
    {
      name: "Professional",
      price: "$199",
      period: "Price annual*",
      features: [
        "365 Days",
        "Elevate your viewing experience with our Professional Subscription Package which is premium-streaming-supreme within a fully inclusive, top-tier quality TV experience"
      ],
      highlighted: false
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
            Ready to subscribe or renew your services? Please select from one of our packages below. Payment methods include crypto, Shakepay and Cash App.
          </p>
          
          {/* Features List */}
          <div className="max-w-3xl mx-auto bg-card border border-border rounded-lg p-8 mb-12">
            <ul className="space-y-4 text-left text-lg text-foreground/90">
              <li className="flex items-start gap-3">
                <span className="text-accent font-bold mt-1">•</span>
                <span>Up to 3 devices per user</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent font-bold mt-1">•</span>
                <span>9,000+ HD channels</span>
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
                <span>VOD library over 5000 commercial-free movies and tv shows on demand</span>
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

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative overflow-hidden animate-fade-in ${
                plan.highlighted ? 'border-accent shadow-[0_0_30px_rgba(255,20,147,0.3)]' : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-muted-foreground">{plan.period}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-foreground">{plan.price}</span>
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="text-foreground/80">
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  variant={plan.highlighted ? "cta" : "outline"} 
                  className="w-full"
                  size="lg"
                >
                  Subscribe Now
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
