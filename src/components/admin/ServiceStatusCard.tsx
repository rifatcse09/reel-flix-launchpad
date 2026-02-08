import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { ServiceMetric } from "@/pages/admin/ServiceStatus";

interface ServiceStatusCardProps {
  service: ServiceMetric;
}

export function ServiceStatusCard({ service }: ServiceStatusCardProps) {
  const statusConfig = {
    operational: {
      dot: "bg-green-500",
      border: "border-green-500/20",
      bg: "bg-green-500/5",
      label: "Operational",
      labelColor: "text-green-400",
    },
    degraded: {
      dot: "bg-yellow-500",
      border: "border-yellow-500/20",
      bg: "bg-yellow-500/5",
      label: "Degraded",
      labelColor: "text-yellow-400",
    },
    outage: {
      dot: "bg-red-500",
      border: "border-red-500/20",
      bg: "bg-red-500/5",
      label: "Outage",
      labelColor: "text-red-400",
    },
  };

  const config = statusConfig[service.status];
  const Icon = service.icon;

  return (
    <Card className={`${config.border} ${config.bg} transition-all hover:shadow-md`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${config.bg}`}>
              <Icon className={`h-4 w-4 ${config.labelColor}`} />
            </div>
            <div>
              <p className="text-sm font-medium">{service.label}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`h-2 w-2 rounded-full ${config.dot} ${service.status !== "operational" ? "animate-pulse" : ""}`} />
                <span className={`text-[11px] font-medium ${config.labelColor}`}>
                  {config.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight">{service.value}</span>
            {service.trend && (
              <div className={`flex items-center gap-0.5 text-xs ${
                service.trend === "up" ? "text-green-400" :
                service.trend === "down" ? "text-red-400" : "text-muted-foreground"
              }`}>
                {service.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : service.trend === "down" ? (
                  <ArrowDownRight className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                <span>{service.trendValue}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{service.detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
