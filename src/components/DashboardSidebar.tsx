import { NavLink } from "react-router-dom";
import { Play, User, BookOpen, Receipt, CreditCard, Lock, HelpCircle, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/reelflix-logo.png";

const menuItems = [
  { title: "Start watching", url: "/dashboard", icon: Play },
  { title: "Profile", url: "/dashboard/profile", icon: User },
  { title: "Apps & Guides", url: "/dashboard/guides", icon: BookOpen },
  { title: "Transactions", url: "/dashboard/transactions", icon: Receipt },
  { title: "Subscriptions", url: "/dashboard/subscriptions", icon: CreditCard },
  { title: "Change password", url: "/dashboard/password", icon: Lock },
  { title: "FAQ", url: "/dashboard/faq", icon: HelpCircle },
];

export function DashboardSidebar() {
  const { toast } = useToast();
  const navigate = useNavigate();

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
    <Sidebar className="border-r border-border bg-black text-white">
      <SidebarContent className="bg-black">
        <div className="p-6">
          <img src={logo} alt="ReelFlix" className="h-12 w-auto" />
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors rounded-lg mx-2 ${
                          isActive
                            ? "bg-accent text-white"
                            : "text-gray-300 hover:bg-white/10"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors rounded-lg mx-2"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Log out</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}