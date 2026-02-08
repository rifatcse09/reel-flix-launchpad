import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WhatsAppFloatingButton from "./components/WhatsAppFloatingButton";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { ImpersonationBanner } from "./components/admin/ImpersonationBanner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import DashboardLayout from "./components/DashboardLayout";
import StartWatching from "./pages/dashboard/StartWatching";
import Profile from "./pages/dashboard/Profile";
import Guides from "./pages/dashboard/Guides";
import Invoices from "./pages/dashboard/Invoices";
import Subscriptions from "./pages/dashboard/Subscriptions";
import ReferralCodes from "./pages/dashboard/ReferralCodes";
import ReferralRewards from "./pages/dashboard/ReferralRewards";
import ChangePassword from "./pages/dashboard/ChangePassword";
import FAQ from "./pages/dashboard/FAQ";
import NotificationPreferences from "./pages/dashboard/NotificationPreferences";
import AdminUsers from "./pages/admin/Users";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import AdminReferralCodes from "./pages/admin/ReferralCodes";
import AdminOverview from "./pages/admin/Overview";
import AdminPayments from "./pages/admin/Payments";
import AdminNotifications from "./pages/admin/Notifications";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminSettings from "./pages/admin/Settings";
import AdminPaymentsQueue from "./pages/admin/PaymentsQueue";
import AdminFulfillmentQueue from "./pages/admin/FulfillmentQueue";
import AdminSystemAudit from "./pages/admin/SystemAudit";
import AdminSystemHealth from "./pages/admin/SystemHealth";
import AdminServiceStatus from "./pages/admin/ServiceStatus";
import AdminIncidents from "./pages/admin/Incidents";
import AdminChangeManagement from "./pages/admin/ChangeManagement";
import AdminBackupRestore from "./pages/admin/BackupRestore";
import AdminDisasterRecovery from "./pages/admin/DisasterRecovery";
import AdminSLAMonitoring from "./pages/admin/SLAMonitoring";
import AdminStaffActivity from "./pages/admin/StaffActivityLog";
import AdminLegalAcceptances from "./pages/admin/LegalAcceptances";
import AdminRunbooks from "./pages/admin/Runbooks";
import AdminElevatedPermissions from "./pages/admin/ElevatedPermissions";
import AdminDataLifecycle from "./pages/admin/DataLifecycle";
import AdminDiagnostics from "./pages/admin/Diagnostics";
import PublicStatus from "./pages/PublicStatus";
import TrustCenter from "./pages/TrustCenter";
import NotFound from "./pages/NotFound";

// Lovable Cloud backend enabled
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TooltipProvider>
        <ImpersonationProvider>
          <Toaster />
          <Sonner />
          <ImpersonationBanner />
          <WhatsAppFloatingButton />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/status" element={<PublicStatus />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<StartWatching />} />
              <Route path="profile" element={<Profile />} />
              <Route path="guides" element={<Guides />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="transactions" element={<Invoices />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="referrals" element={<ReferralCodes />} />
              <Route path="referral-rewards" element={<ReferralRewards />} />
              <Route path="password" element={<ChangePassword />} />
              <Route path="faq" element={<FAQ />} />
              <Route path="notifications" element={<NotificationPreferences />} />
            </Route>
            <Route path="/admin" element={<DashboardLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="overview" element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="payments-queue" element={<AdminPaymentsQueue />} />
              <Route path="fulfillment-queue" element={<AdminFulfillmentQueue />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="referrals" element={<AdminReferralCodes />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="system-audit" element={<AdminSystemAudit />} />
              <Route path="system-health" element={<AdminSystemHealth />} />
              <Route path="service-status" element={<AdminServiceStatus />} />
              <Route path="incidents" element={<AdminIncidents />} />
              <Route path="changes" element={<AdminChangeManagement />} />
              <Route path="backup-restore" element={<AdminBackupRestore />} />
              <Route path="disaster-recovery" element={<AdminDisasterRecovery />} />
              <Route path="sla-monitoring" element={<AdminSLAMonitoring />} />
              <Route path="staff-activity" element={<AdminStaffActivity />} />
              <Route path="legal-acceptances" element={<AdminLegalAcceptances />} />
              <Route path="runbooks" element={<AdminRunbooks />} />
              <Route path="elevated-permissions" element={<AdminElevatedPermissions />} />
              <Route path="data-lifecycle" element={<AdminDataLifecycle />} />
              <Route path="diagnostics" element={<AdminDiagnostics />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="/trust" element={<TrustCenter />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ImpersonationProvider>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
