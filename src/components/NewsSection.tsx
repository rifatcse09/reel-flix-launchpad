import tvNews from "@/assets/tv-news.png";

const NewsSection = () => {
  return (
    <section className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-scale-in">
            <img 
              src={tvNews} 
              alt="Breaking news on TV" 
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
          <div className="animate-slide-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
              Watch breaking news
            </h2>
            <p className="text-lg text-foreground/80 leading-relaxed">
              Catch the latest in live sports, and binge watch your favorite TV shows 
              and movies on demand. We offer VOD (video on demand) content you 
              can pause, rewind, or fast forward any time, so you don't miss out on a 
              minute of the entertainment that's important to YOU.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
