import { NavLink } from "react-router-dom";
import { Play, User, BookOpen, Receipt, CreditCard, Lock, HelpCircle, LogOut, Gift, Users, Shield, LayoutDashboard, Banknote, Bell, BarChart3, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import logo from "@/assets/reelflix-logo.png";

const menuItems = [
  { title: "Start watching", url: "/dashboard", icon: Play },
  { title: "Profile", url: "/dashboard/profile", icon: User },
  { title: "Apps & Guides", url: "/dashboard/guides", icon: BookOpen },
  { title: "Transactions", url: "/dashboard/transactions", icon: Receipt },
  { title: "Subscriptions", url: "/dashboard/subscriptions", icon: CreditCard },
  { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
  { title: "Change password", url: "/dashboard/password", icon: Lock },
  { title: "FAQ", url: "/dashboard/faq", icon: HelpCircle },
];

const adminItems = [
  { title: "Overview", url: "/admin/overview", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Payments", url: "/admin/payments", icon: Banknote },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: CreditCard },
  { title: "Referral Codes", url: "/admin/referrals", icon: Gift },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function DashboardSidebar() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();

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
    <Sidebar className="border-r border-border bg-background text-white">
      <SidebarContent className="bg-background">
        <div className="p-6">
          <img src={logo} alt="ReelFlix" className="h-12 w-auto" />
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavLink
                    to={item.url}
                    end={item.url === "/dashboard"}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-300 rounded-lg mx-2 ${
                        isActive
                          ? "bg-[#ff1493] text-white shadow-[0_0_20px_rgba(255,20,147,0.5)]"
                          : "text-gray-300 hover:bg-white/10"
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuItem>
              ))}
              
              <SidebarMenuItem>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors rounded-lg mx-2"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Log out</span>
                </button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                  <NavLink
                    to={item.url}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-300 rounded-lg mx-2 ${
                        isActive
                          ? "bg-[#ff1493] text-white shadow-[0_0_20px_rgba(255,20,147,0.5)]"
                          : "text-gray-300 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,20,147,0.2)]"
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </NavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}