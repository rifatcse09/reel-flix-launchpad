import { NavLink } from "react-router-dom";
import { Play, User, BookOpen, Receipt, CreditCard, Lock, HelpCircle, LogOut, Gift, Users, Shield, LayoutDashboard, Banknote, Bell, BarChart3, Settings, Package, DollarSign, Truck, Activity, HeartPulse, ClipboardList, FileCheck, Server, AlertTriangle, FileText, Database, Target, BookMarked, ShieldPlus, Recycle, Stethoscope } from "lucide-react";
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
import { usePermissions, type Permission } from "@/hooks/usePermissions";
import { RoleBadge } from "@/components/admin/RoleBadge";
import logo from "@/assets/reelflix-logo.png";

const menuItems = [
  { title: "Start watching", url: "/dashboard", icon: Play },
  { title: "Profile", url: "/dashboard/profile", icon: User },
  { title: "Apps & Guides", url: "/dashboard/guides", icon: BookOpen },
  { title: "Invoices", url: "/dashboard/invoices", icon: Receipt },
  { title: "Subscriptions", url: "/dashboard/subscriptions", icon: CreditCard },
  { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
  { title: "Change password", url: "/dashboard/password", icon: Lock },
  { title: "FAQ", url: "/dashboard/faq", icon: HelpCircle },
];

interface AdminMenuItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}

const adminItems: AdminMenuItem[] = [
  { title: "Overview", url: "/admin/overview", icon: LayoutDashboard, permission: 'view_analytics' },
  { title: "Users", url: "/admin/users", icon: Users, permission: 'view_users' },
  { title: "Payments Queue", url: "/admin/payments-queue", icon: DollarSign, permission: 'view_payments' },
  { title: "Fulfillment Queue", url: "/admin/fulfillment-queue", icon: Truck, permission: 'view_fulfillment' },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: CreditCard, permission: 'view_subscriptions' },
  { title: "Revenue", url: "/admin/payments", icon: Banknote, permission: 'view_payments' },
  { title: "Referral Codes", url: "/admin/referrals", icon: Gift, permission: 'view_referrals' },
  { title: "Notifications", url: "/admin/notifications", icon: Bell, permission: 'view_notifications' },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3, permission: 'view_analytics' },
  { title: "System Audit", url: "/admin/system-audit", icon: Activity, permission: 'view_system_audit' },
  { title: "System Health", url: "/admin/system-health", icon: HeartPulse, permission: 'view_system_health' },
  { title: "Service Status", url: "/admin/service-status", icon: Server, permission: 'view_system_health' },
  { title: "Incidents", url: "/admin/incidents", icon: AlertTriangle, permission: 'view_system_health' },
  { title: "Changes", url: "/admin/changes", icon: FileText, permission: 'view_system_health' },
  { title: "Backup & Restore", url: "/admin/backup-restore", icon: Database, permission: 'view_system_health' },
  { title: "Disaster Recovery", url: "/admin/disaster-recovery", icon: Shield, permission: 'view_system_health' },
  { title: "SLA Monitoring", url: "/admin/sla-monitoring", icon: Target, permission: 'view_system_health' },
  { title: "Runbooks", url: "/admin/runbooks", icon: BookMarked, permission: 'view_system_health' },
  { title: "Staff Activity", url: "/admin/staff-activity", icon: ClipboardList, permission: 'view_system_audit' },
  { title: "Legal Consents", url: "/admin/legal-acceptances", icon: FileCheck, permission: 'view_system_audit' },
  { title: "Elevated Permissions", url: "/admin/elevated-permissions", icon: ShieldPlus, permission: 'manage_roles' },
  { title: "Data Lifecycle", url: "/admin/data-lifecycle", icon: Recycle, permission: 'manage_settings' },
  { title: "Diagnostics", url: "/admin/diagnostics", icon: Stethoscope, permission: 'view_system_health' },
  { title: "Settings", url: "/admin/settings", icon: Settings, permission: 'view_settings' },
];

export function DashboardSidebar() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAnyAdmin, role, hasPermission } = usePermissions();

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

  const visibleAdminItems = adminItems.filter(item => hasPermission(item.permission));

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

        {isAnyAdmin && visibleAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>Admin</span>
              {role && <RoleBadge role={role} size="sm" />}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminItems.map((item) => (
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
