import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle } from "lucide-react";
import logo from "@/assets/reelflix-logo.png";

const WHATSAPP_NUMBER = "13473404523";

const getWhatsAppMessage = (pathname: string): string => {
  if (pathname.includes("pricing") || pathname === "/#pricing") {
    return "Hi ReelFlix, I have a question about pricing.";
  }
  if (pathname.includes("register") || pathname.includes("checkout")) {
    return "Hi ReelFlix, I need help completing my order.";
  }
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    return "Hi ReelFlix, I need technical support.";
  }
  return "Hi ReelFlix, I need help with my account.";
};

const getWhatsAppUrl = (pathname: string): string => {
  const message = encodeURIComponent(getWhatsAppMessage(pathname));
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
};

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const whatsappUrl = getWhatsAppUrl(location.pathname);

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
            <a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
              <img 
                src={logo} 
                alt="ReelFlix" 
                className="h-10 w-auto cursor-pointer" 
              />
            </a>
            <a href="tel:347-340-4523" className="flex items-center gap-2 text-accent font-medium hover:text-accent/80 transition-colors text-sm md:text-base">
              <span>📞</span> 347-340-4523
            </a>
            <div className="hidden md:flex items-center gap-8">
              <a 
                href="/#home" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  navigate('/');
                  setTimeout(() => document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }} 
                className="text-foreground hover:text-accent transition-colors font-medium cursor-pointer"
              >
                Home
              </a>
              <a 
                href="/#services" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  navigate('/');
                  setTimeout(() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }} 
                className="text-foreground hover:text-accent transition-colors font-medium cursor-pointer"
              >
                Services
              </a>
              <a 
                href="/#pricing" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  navigate('/');
                  setTimeout(() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }} 
                className="text-foreground hover:text-accent transition-colors font-medium cursor-pointer"
              >
                Pricing & Packages
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20BD5A] text-white font-medium px-3 py-2 rounded-full text-sm transition-colors"
              aria-label="WhatsApp Support"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp Support</span>
            </a>
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
                  onClick={() => navigate('/register')}
                >
                  Create Account
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
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
