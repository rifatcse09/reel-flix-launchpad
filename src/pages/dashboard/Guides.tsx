import { Badge } from "@/components/ui/badge";
import { Tv, Smartphone, Box, Download, FileText, Play, Star } from "lucide-react";
import tivimaxIcon from "@/assets/tivimax-icon.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Guides = () => {
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('ends_at, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('ends_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscription?.ends_at) {
        const endDate = new Date(subscription.ends_at);
        const now = new Date();
        const diffMs = endDate.getTime() - now.getTime();
        
        if (diffMs > 0) {
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const months = Math.floor(diffDays / 30);
          const days = diffDays % 30;
          
          if (months > 0) {
            setSubscriptionExpiry(`${months} month${months > 1 ? 's' : ''} and ${days} day${days !== 1 ? 's' : ''}`);
          } else {
            setSubscriptionExpiry(`${days} day${days !== 1 ? 's' : ''}`);
          }
        } else {
          setSubscriptionExpiry('Expired');
        }
      }
    };

    fetchSubscription();
  }, []);
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
        {subscriptionExpiry && (
          <Badge variant="destructive" className="bg-accent/10 text-accent border-accent/20">
            Subscription expiry<br />{subscriptionExpiry}
          </Badge>
        )}
      </div>

      {/* Recommendation Box */}
      <div className="p-6 rounded-lg bg-accent/10 border border-accent/20">
        <h3 className="font-semibold text-lg mb-3">Our Recommendations</h3>
        <p className="text-sm mb-2">
          <span className="font-medium text-accent">For the best user experience, we recommend using TiviMate.</span>
        </p>
        <p className="text-sm text-muted-foreground">
          IPTV Smarters Pro and IBO Player IPTV also work well, but the best user-friendly experience is with TiviMate.
        </p>
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
        <div className="h-32 w-32 bg-white rounded-lg flex items-center justify-center overflow-hidden">
          <img src={tivimaxIcon} alt="TiviMax" className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">For iOS devices recommend</p>
          <p className="font-medium">TiviMax</p>
          <p className="text-sm text-muted-foreground">Download from iOS App Store</p>
        </div>
      </div>
    </div>
  );
};

export default Guides;