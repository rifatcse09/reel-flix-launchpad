import { Tv, Globe, Trophy, PlayCircle, Headphones } from "lucide-react";

const ServiceSection = () => {
  const streamingServices = [
    "Netflix", "Amazon Prime", "Hulu", "Disney+", "HBO Max", "Peacock", "Paramount"
  ];

  const sports = ["NFL", "NHL", "MLB", "NBA", "Soccer"];

  const features = [
    {
      icon: PlayCircle,
      title: "Premium Streaming Services",
      description: "Access to Netflix, Amazon Prime, Hulu, Disney+, HBO Max, Peacock, Paramount, and more"
    },
    {
      icon: Trophy,
      title: "All Major Sports",
      description: "NFL, NHL, MLB, NBA, Soccer, and all your favorite sporting events"
    },
    {
      icon: Tv,
      title: "Over 10,000+ Channels",
      description: "Live TV with over 10,000+ channels to choose from"
    },
    {
      icon: Globe,
      title: "International Content",
      description: "Channels from around the world in multiple languages"
    },
    {
      icon: Headphones,
      title: "24/7 Customer Service",
      description: "Round-the-clock support to help with setup and troubleshooting"
    }
  ];

  return (
    <section id="services" className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center text-foreground">
            What's Included
          </h2>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-card p-6 rounded-lg border border-border hover:border-accent transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <feature.icon className="w-12 h-12 text-accent mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-foreground/70 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Streaming Services */}
          <div className="bg-card p-8 rounded-lg border border-border mb-8">
            <h3 className="text-2xl font-bold mb-6 text-foreground">Premium Streaming Platforms</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              {streamingServices.map((service, index) => (
                <div 
                  key={index}
                  className="bg-secondary/50 p-4 rounded-lg text-center font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-300"
                >
                  {service}
                </div>
              ))}
            </div>
          </div>

          {/* Sports */}
          <div className="bg-card p-8 rounded-lg border border-border mb-8">
            <h3 className="text-2xl font-bold mb-6 text-foreground">Live Sports Coverage</h3>
            <div className="flex flex-wrap gap-3 justify-center">
              {sports.map((sport, index) => (
                <span 
                  key={index}
                  className="bg-accent text-accent-foreground px-6 py-3 rounded-full font-bold text-lg hover:scale-105 transition-transform duration-300"
                >
                  {sport}
                </span>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-6 text-lg text-foreground/80 leading-relaxed mb-16">
            <p>
              Works on practically any device with a screen and an internet 
              connection. That means your must-watch TV can go from your phone 
              when you're on your commute, to the SmartTV when you arrive 
              home, without interruption.
            </p>
            <p>
              Our service includes live sports streaming, over 20,000 movies and 
              TV series, live news, and over 10,000+ international TV channels from around the world. All 
              available to watch at the touch of a button, and updated daily.
            </p>
            <p>
              Not only do we not sell you anything you don't want, but we are also 
              passionate about ensuring your technical experience is the best it 
              can be. That's why we will work with you, 1-on-1, to help you get set 
              up, and troubleshoot any issues you might have.
            </p>
          </div>

          {/* Testimonials Section */}
          <div className="mt-24">
            <p className="text-accent text-center font-semibold mb-4 text-lg">ReelFlix Fans</p>
            <h3 className="text-4xl md:text-5xl font-bold text-center mb-12 text-foreground">
              Don't take our word for it.
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-background border border-border rounded-lg p-6 hover:border-accent transition-all duration-300">
                <p className="text-foreground/80 mb-6 leading-relaxed">
                  Awesome service. I highly recommend. I have recommended several people and have made the switch from tv. I only use this service for all our tv needs.
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                    LD
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Lee Daniel</p>
                    <p className="text-sm text-muted-foreground">Louisville, KY</p>
                  </div>
                </div>
              </div>

              <div className="bg-background border border-border rounded-lg p-6 hover:border-accent transition-all duration-300">
                <p className="text-foreground/80 mb-6 leading-relaxed">
                  ReelFlix is a dependable option for streaming new and classic shows as well as live TV on nearly every platform. It's a top choice among video streaming services.
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                    KS
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Kathryn Shelton</p>
                    <p className="text-sm text-muted-foreground">North Hempstead, NY</p>
                  </div>
                </div>
              </div>

              <div className="bg-background border border-border rounded-lg p-6 hover:border-accent transition-all duration-300">
                <p className="text-foreground/80 mb-6 leading-relaxed">
                  This is an exciting, affordable and most affordable entry into the world of streaming international cinema. I am very pleased and sincerely recommend!
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                    BM
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Betty Moore</p>
                    <p className="text-sm text-muted-foreground">Philadelphia, PA</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceSection;
