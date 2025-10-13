import { Tv, Globe, Trophy, PlayCircle } from "lucide-react";

const ServiceSection = () => {
  const streamingServices = [
    "Netflix", "Amazon Prime", "Hulu", "Disney+", "HBO Max", "Peacock"
  ];

  const sports = ["NFL", "NHL", "MLB", "NBA", "Soccer"];

  const features = [
    {
      icon: PlayCircle,
      title: "Premium Streaming Services",
      description: "Access to Netflix, Amazon Prime, Hulu, Disney+, HBO Max, Peacock, and more"
    },
    {
      icon: Trophy,
      title: "All Major Sports",
      description: "NFL, NHL, MLB, NBA, Soccer, and all your favorite sporting events"
    },
    {
      icon: Tv,
      title: "Over 9,000 Channels",
      description: "Live TV with thousands of channels to choose from"
    },
    {
      icon: Globe,
      title: "International Content",
      description: "Channels from around the world in multiple languages"
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <div className="space-y-6 text-lg text-foreground/80 leading-relaxed">
            <p>
              Works on practically any device with a screen and an internet 
              connection. That means your must-watch TV can go from your phone 
              when you're on your commute, to the SmartTV when you arrive 
              home, without interruption.
            </p>
            <p>
              Our service includes live sports streaming, over 20,000 movies and 
              TV series, live news, and over 9,000 international TV channels from around the world. All 
              available to watch at the touch of a button, and updated daily.
            </p>
            <p>
              Not only do we not sell you anything you don't want, but we are also 
              passionate about ensuring your technical experience is the best it 
              can be. That's why we will work with you, 1-on-1, to help you get set 
              up, and troubleshoot any issues you might have.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceSection;
