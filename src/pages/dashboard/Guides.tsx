import { Badge } from "@/components/ui/badge";
import { Tv, Smartphone, Box, Download, FileText, Play, Star } from "lucide-react";

const Guides = () => {
  const apps = [
    { name: "Android Box (STB)", icon: Box, downloadLink: "#" },
    { name: "Android TV", icon: Tv, downloadLink: "#" },
    { name: "Android Mobile", icon: Smartphone, downloadLink: "#" },
  ];

  const guides = [
    { name: "Tivimate", icon: Play, link: "https://tivimate.com", recommended: true },
    { name: "LG TVs Use Fire Stick with Tivimate", icon: Play },
    { name: "IBO Player IPTV For Samsung TVs", icon: Tv, recommended: true },
    { name: "GSE/IPTVSmarters", icon: Tv },
    { name: "Firestick", icon: Tv, recommended: true },
    { name: "Emby", icon: Play },
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
              <a href={app.downloadLink} className="text-accent hover:underline flex items-center gap-1 text-sm">
                Download <Download className="h-3 w-3" />
              </a>
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
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
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
        <div className="p-4 bg-blue-500/10 rounded-lg">
          <Smartphone className="h-12 w-12 text-blue-500" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">For iOS devices recommend</p>
          <p className="font-medium">Startup show</p>
        </div>
      </div>
    </div>
  );
};

export default Guides;