import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logo from "@/assets/reelflix-logo.png";

const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <img src={logo} alt="ReelFlix" className="h-10 w-auto" />
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-foreground hover:text-primary transition-colors font-medium">
                Home
              </Link>
              <a href="#services" className="text-foreground hover:text-primary transition-colors font-medium">
                Services
              </a>
              <a href="#pricing" className="text-foreground hover:text-primary transition-colors font-medium">
                Pricing & Packages
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="default" asChild>
              <Link to="/auth">Login</Link>
            </Button>
            <Button variant="cta" size="default" asChild>
              <Link to="/auth">Create Account</Link>
            </Button>
            <Button variant="outline" size="default" className="hidden lg:inline-flex border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              24-hour free trial
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
