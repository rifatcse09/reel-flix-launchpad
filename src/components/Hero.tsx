import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroBackground from "@/assets/hero-background.jpg";

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background"></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-32 text-center animate-fade-in">
        <p className="text-foreground/80 text-lg mb-4 tracking-wide uppercase">
          Anytime - Anywhere - Any Screen
        </p>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-foreground">
          ReelFlix - Leading<br />Streaming Provider
        </h1>
        <p className="text-xl md:text-2xl text-foreground/90 mb-8 max-w-3xl mx-auto">
          Access to your favorite HD content as low as 16.58 per month.*
        </p>
        <Link 
          to="/auth"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-lg font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_30px_rgba(255,20,147,0.4)] hover:shadow-[0_0_40px_rgba(255,20,147,0.6)] transition-all duration-300 px-12 py-6"
        >
          Start now
        </Link>
        <p className="text-sm text-muted-foreground mt-12">
          *16.58/month rate based on annual subscription billed as an annual payment of $199
        </p>
      </div>
    </section>
  );
};

export default Hero;
