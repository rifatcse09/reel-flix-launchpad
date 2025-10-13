import mobileMockup from "@/assets/mobile-mockup.png";

const MobileSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 animate-slide-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
              On the go?
            </h2>
            <p className="text-lg text-foreground/80 leading-relaxed">
              No problem! Our worldwide service offers you the flexibility to keep up 
              to date with all the drama and action of your favorite programs no 
              matter how far you roam. And if you're missing local programming from 
              home? We have you covered with live TV channels from all over the 
              world, right to where you are.
            </p>
          </div>
          <div className="order-1 md:order-2 flex justify-center animate-scale-in">
            <img 
              src={mobileMockup} 
              alt="Mobile streaming app" 
              className="w-full max-w-md drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileSection;
