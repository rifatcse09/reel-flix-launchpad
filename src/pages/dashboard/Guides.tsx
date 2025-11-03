import { Badge } from "@/components/ui/badge";
import { Tv, Smartphone, Box, Download, FileText, Play, Star } from "lucide-react";
import tivimaxIcon from "@/assets/tivimax-icon.png";

const Guides = () => {
  const apps = [
    { name: "Android Box (STB)", icon: Box, guideLink: "https://www.youtube.com/watch?v=Yk5CR3p3ZAA" },
    { name: "Android TV", icon: Tv, guideLink: "https://tivimate.com" },
    { name: "Android Mobile", icon: Smartphone, guideLink: "https://tivimate.com" },
  ];

  const guides = [
    { name: "Tivimate", icon: Play, link: "https://tivimate.com", recommended: true, description: "Best user experience" },
    { name: "IBO Player IPTV For Samsung TVs", icon: Tv, recommended: true, stars: 3 },
    { name: "Firestick", icon: Tv, recommended: true },
    { name: "IPTV Smarters Pro", icon: Tv, link: "https://www.youtube.com/watch?v=izNye1uPaNk", recommended: true, stars: 3 },
    { name: "LG TVs Use Fire Stick with Tivimate", icon: Play, recommended: true, stars: 5 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Apps & Guides</h1>
        <Badge variant="destructive" className="bg-accent/10 text-accent border-accent/20">
          Subscription expiry<br />5 months and 27 days
        </Badge>
      </div>

      {/* Apps Section */}
      <div className="space-y-6">
        {apps.map((app) => (
          <div key={app.name} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="p-3 bg-background rounded-lg">
              <app.icon className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{app.name}</h3>
              {app.guideLink && (
                <a href={app.guideLink} className="text-accent hover:underline flex items-center gap-1 text-sm" target="_blank" rel="noopener noreferrer">
                  Guide <FileText className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Guides Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Guides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guides.map((guide) => (
            <div key={guide.name} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="p-3 bg-background rounded-lg">
                <guide.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{guide.name}</h3>
                  {guide.recommended && (
                    <Badge variant="default" className="bg-accent text-accent-foreground">
                      Highly Recommended
                    </Badge>
                  )}
                </div>
                {guide.recommended && (
                  <div className="flex gap-0.5 mb-1">
                    {[...Array(guide.stars || 5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                )}
                {guide.description && (
                  <p className="text-sm text-muted-foreground mb-1">{guide.description}</p>
                )}
                <a href={guide.link || "#"} className="text-accent hover:underline flex items-center gap-1 text-sm" target="_blank" rel="noopener noreferrer">
                  Guide <FileText className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* iOS Recommendation */}
      <div className="flex items-center gap-4 p-6 rounded-lg bg-muted/30">
        <div className="p-4 bg-white rounded-lg">
          <img src={tivimaxIcon} alt="TiviMax" className="h-80 w-80 object-contain" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">For iOS devices recommend</p>
          <p className="font-medium">TiviMax</p>
        </div>
      </div>
    </div>
  );
};

export default Guides;