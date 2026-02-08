import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { NotificationBell } from "./NotificationBell";
import { CriticalIncidentBanner } from "./admin/CriticalIncidentBanner";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceTracking } from "@/hooks/useDeviceTracking";
import { Loader2 } from "lucide-react";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Track device usage
  useDeviceTracking();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/auth?mode=login');
      return;
    }

    // Check if the user's profile still exists
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error || !profile) {
      // Profile has been deleted - log out the user
      await supabase.auth.signOut();
      navigate('/auth?mode=login');
      return;
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <main className="flex-1 bg-background">
          <CriticalIncidentBanner />
          <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background">
            <SidebarTrigger className="text-foreground" />
            <NotificationBell />
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;