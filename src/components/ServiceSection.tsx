const ServiceSection = () => {
  return (
    <section id="services" className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-foreground">
            Our service
          </h2>
          <div className="space-y-6 text-lg text-foreground/80 leading-relaxed">
            <p>
              Works on practically any device with a screen and an internet 
              connection. That means your must-watch TV can go from your phone 
              when you're on your commute, to the SmartTV when you arrive 
              home, without interruption.
            </p>
            <p>
              Our service includes live sports streaming, over 20,000 movies and 
              TV series, live news, and over 1000+ international TV channels. All 
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
