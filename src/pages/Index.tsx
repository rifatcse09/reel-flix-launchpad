import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import BusinessCard from "@/components/BusinessCard";
import MobileSection from "@/components/MobileSection";
import NewsSection from "@/components/NewsSection";
import FeaturesSection from "@/components/FeaturesSection";
import PricingSection from "@/components/PricingSection";
import ServiceSection from "@/components/ServiceSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import { useReferralCapture } from "@/hooks/useReferralCapture";

const Index = () => {
  useReferralCapture();
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <section className="py-16 flex justify-center items-center bg-background">
          <BusinessCard />
        </section>
        <MobileSection />
        <NewsSection />
        <FeaturesSection />
        <PricingSection />
        <ServiceSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
