import { Film } from "lucide-react";
import reelflixLogo from "@/assets/reelflix-logo.png";
import { Card } from "@/components/ui/card";

const BusinessCard = () => {
  return (
    <Card className="w-[350px] h-[200px] bg-gradient-to-br from-primary via-primary/90 to-primary/80 border-2 border-primary/20 shadow-xl overflow-hidden relative">
      {/* Decorative movie reel pattern */}
      <div className="absolute top-0 right-0 opacity-10">
        <Film className="w-32 h-32 text-background" />
      </div>
      <div className="absolute bottom-0 left-0 opacity-10">
        <Film className="w-24 h-24 text-background" />
      </div>
      
      <div className="relative z-10 p-6 h-full flex flex-col justify-between">
        {/* Logo section */}
        <div className="flex items-center gap-3">
          <img 
            src={reelflixLogo} 
            alt="ReelFlix Logo" 
            className="h-12 w-auto"
          />
        </div>
        
        {/* Info section */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-accent">ReelFlix</h2>
          <p className="text-background/90 text-sm font-medium">Leading Streaming Provider</p>
          <div className="pt-2 space-y-0.5 text-background/80 text-xs">
            <p>24/7 Customer Service</p>
            <p>4K & HD Content</p>
            <p className="text-accent font-semibold">Starting at $13.33/month</p>
          </div>
        </div>
        
        {/* Movie reel icon */}
        <div className="absolute bottom-4 right-6">
          <Film className="w-8 h-8 text-accent" />
        </div>
      </div>
    </Card>
  );
};

export default BusinessCard;
