import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroBackground from "@/assets/hero-background.jpg";

const Hero = () => {
  const navigate = useNavigate();
  
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background"></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-32 text-center animate-fade-in">
        <div className="flex flex-col items-center gap-2 mb-4">
          <p className="text-foreground/80 text-lg tracking-wide uppercase">
            Anytime - Anywhere - Any Screen
          </p>
          <p className="text-accent text-lg font-semibold tracking-wide uppercase">
            24/7 Customer Service
          </p>
        </div>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-foreground">
          ReelFlix - Leading<br />Streaming Provider
        </h1>
        <p className="text-xl md:text-2xl text-foreground/90 mb-8 max-w-3xl mx-auto">
          Access to your favorite 4K and HD content as low as $13.33 per month.*
        </p>
        <Button 
          variant="hero" 
          size="lg" 
          className="px-12 py-6 text-lg h-auto rounded-full"
          onClick={() => navigate('/register')}
        >
          Start now
        </Button>
        <p className="text-sm text-muted-foreground mt-12">
          *From $13.33/month — based on the 1-device yearly plan. Pricing controlled centrally and subject to change.
        </p>
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-sm text-foreground/70">We Accept</p>
          <div className="flex items-center gap-4 text-accent font-medium">
            <span>Cash App</span>
            <span className="text-foreground/40">•</span>
            <span>Zelle</span>
            <span className="text-foreground/40">•</span>
            <span>Cryptocurrency</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
