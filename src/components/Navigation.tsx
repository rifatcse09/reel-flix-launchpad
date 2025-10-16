import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/reelflix-logo.png";

const Navigation = () => {
  const navigate = useNavigate();
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <img 
              src={logo} 
              alt="ReelFlix" 
              className="h-10 w-auto cursor-pointer" 
              onClick={() => window.location.href = '/'}
            />
            <div className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-foreground hover:text-primary transition-colors font-medium">
                Home
              </a>
              <a href="#services" className="text-foreground hover:text-primary transition-colors font-medium">
                Services
              </a>
              <a href="#pricing" className="text-foreground hover:text-primary transition-colors font-medium">
                Pricing & Packages
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="default" type="button" onClick={() => navigate('/auth')}>
              Login
            </Button>
            <Button variant="cta" size="default" type="button" onClick={() => navigate('/auth')}>
              Create Account
            </Button>
            <Button 
              variant="outline" 
              size="default" 
              type="button"
              className="hidden lg:inline-flex border-accent text-accent hover:bg-accent hover:text-accent-foreground"
              onClick={() => navigate('/auth')}
            >
              24-hour free trial
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
