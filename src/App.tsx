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
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ImpersonationProvider>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
