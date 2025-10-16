import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logo from "@/assets/reelflix-logo.png";

const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link to="/">
              <img 
                src={logo} 
                alt="ReelFlix" 
                className="h-10 w-auto cursor-pointer" 
              />
            </Link>
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
            <Link to="/auth">
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 transition-colors cursor-pointer">
                Login
              </button>
            </Link>
            <Link to="/auth">
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 py-2 cursor-pointer">
                Create Account
              </button>
            </Link>
            <Link to="/auth" className="hidden lg:inline-flex">
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-accent text-accent hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 transition-colors cursor-pointer">
                24-hour free trial
              </button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
