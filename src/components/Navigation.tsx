import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/reelflix-logo.png";

const Navigation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
      navigate('/');
    }
  };
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
              <img 
                src={logo} 
                alt="ReelFlix" 
                className="h-10 w-auto cursor-pointer" 
              />
            </a>
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
            {isLoggedIn ? (
              <>
                <Button 
                  variant="ghost" 
                  size="default"
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  size="default"
                  onClick={handleLogout}
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="default"
                  onClick={() => navigate('/auth?mode=login')}
                >
                  Login
                </Button>
                <Button 
                  variant="cta" 
                  size="default"
                  onClick={() => navigate('/auth?mode=signup')}
                >
                  Create Account
                </Button>
                <Button 
                  variant="outline" 
                  size="default" 
                  className="hidden lg:inline-flex border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                  onClick={() => navigate('/register')}
                >
                  24h free trial
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
