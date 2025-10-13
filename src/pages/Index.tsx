import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import MobileSection from "@/components/MobileSection";
import NewsSection from "@/components/NewsSection";
import PricingSection from "@/components/PricingSection";
import ServiceSection from "@/components/ServiceSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <MobileSection />
        <NewsSection />
        <PricingSection />
        <ServiceSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
