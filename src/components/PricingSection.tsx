import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const PricingSection = () => {
  const plans = [
    {
      name: "Professional",
      price: "$159.99",
      period: "Price annual*",
      features: [
        "365 Days",
        "Elevate your viewing experience with our Professional Subscription Package which is premium-streaming-supreme within a fully inclusive, top-tier quality TV experience"
      ],
      highlighted: false
    },
    {
      name: "Elite",
      price: "$89.99",
      period: "Price monthly*",
      features: [
        "180 Days",
        "Experience excellence with our Elite Subscription Package! Renowned for its comprehensive lineup of channels and features tailored for discerning entertainment enthusiasts, the Elite Subscription Package"
      ],
      highlighted: true
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container mx-auto px-4">
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

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
