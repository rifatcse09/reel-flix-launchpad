import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DashboardLayout from "./components/DashboardLayout";
import StartWatching from "./pages/dashboard/StartWatching";
import Profile from "./pages/dashboard/Profile";
import Guides from "./pages/dashboard/Guides";
import Transactions from "./pages/dashboard/Transactions";
import Subscriptions from "./pages/dashboard/Subscriptions";
import ReferralCodes from "./pages/dashboard/ReferralCodes";
import ChangePassword from "./pages/dashboard/ChangePassword";
import FAQ from "./pages/dashboard/FAQ";
import NotFound from "./pages/NotFound";

// Lovable Cloud backend enabled
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<StartWatching />} />
            <Route path="profile" element={<Profile />} />
            <Route path="guides" element={<Guides />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="referrals" element={<ReferralCodes />} />
            <Route path="password" element={<ChangePassword />} />
            <Route path="faq" element={<FAQ />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
