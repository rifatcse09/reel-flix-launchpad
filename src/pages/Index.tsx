import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import MobileSection from "@/components/MobileSection";
import NewsSection from "@/components/NewsSection";
import FeaturesSection from "@/components/FeaturesSection";
import PricingSection from "@/components/PricingSection";
import ServiceSection from "@/components/ServiceSection";
import Footer from "@/components/Footer";
import { useReferralCapture } from "@/hooks/useReferralCapture";

const Index = () => {
  useReferralCapture();
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <MobileSection />
        <NewsSection />
        <FeaturesSection />
        <PricingSection />
        <ServiceSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
