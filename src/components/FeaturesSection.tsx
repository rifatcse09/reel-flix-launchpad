import { Smartphone, Tv, Tablet, Wifi, Shield, CheckCircle2 } from "lucide-react";

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Stream Anywhere, Anytime
          </h2>
          <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
            Enjoy unlimited entertainment on all your devices with complete flexibility
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Device Compatibility */}
          <div className="bg-card p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 animate-scale-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">All Devices</h3>
            </div>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Compatible with tablets, Android, iOS devices, and smart TVs. Watch on any screen you own.
            </p>
            <div className="flex gap-4 mt-6">
              <Tablet className="h-6 w-6 text-primary/70" />
              <Smartphone className="h-6 w-6 text-primary/70" />
              <Tv className="h-6 w-6 text-primary/70" />
            </div>
          </div>

          {/* No Commitment */}
          <div className="bg-card p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 animate-scale-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Commitment Free</h3>
            </div>
            <p className="text-foreground/80 leading-relaxed">
              Sign up with confidence. Cancel anytime, no strings attached. Your satisfaction is our priority.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-primary">Cancel Anytime</span>
            </div>
          </div>

          {/* Network Flexibility */}
          <div className="bg-card p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 animate-scale-in md:col-span-2 lg:col-span-1" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Wifi className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Total Flexibility</h3>
            </div>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Stream seamlessly on WiFi or cellular data. VPNs fully supported for secure viewing anywhere.
            </p>
            <div className="flex gap-4 mt-6">
              <Wifi className="h-6 w-6 text-primary/70" />
              <Shield className="h-6 w-6 text-primary/70" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
