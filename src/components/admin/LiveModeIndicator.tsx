import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface LiveModeIndicatorProps {
  lastUpdate: Date;
}

export const LiveModeIndicator = ({ lastUpdate }: LiveModeIndicatorProps) => {
  const getTimeSinceUpdate = () => {
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    return 'Over 1h ago';
  };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="outline" 
        className="bg-success/10 text-success border-success/20 animate-pulse"
      >
        <div className="relative flex items-center gap-2">
          {/* Pulse ring */}
          <div className="absolute -left-1">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </span>
          </div>
          <Activity className="h-3 w-3 ml-3" />
          <span className="font-medium">LIVE</span>
        </div>
      </Badge>
      <p className="text-xs text-muted-foreground">
        Last update: {getTimeSinceUpdate()}
      </p>
    </div>
  );
};
