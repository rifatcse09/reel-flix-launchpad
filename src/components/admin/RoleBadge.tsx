import { Badge } from "@/components/ui/badge";
import { getRoleLabel, getRoleColor, type AdminRole } from "@/hooks/usePermissions";
import { Shield, Eye, DollarSign, BarChart3, Truck, Crown } from "lucide-react";

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  super_admin: Crown,
  admin: Shield,
  support_agent: Eye,
  billing_admin: DollarSign,
  analyst: BarChart3,
  fulfillment_agent: Truck,
};

interface RoleBadgeProps {
  role: AdminRole | string;
  size?: 'sm' | 'md';
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const Icon = ROLE_ICONS[role] || Shield;
  const colorClass = getRoleColor(role);
  const label = getRoleLabel(role);

  return (
    <Badge
      variant="outline"
      className={`gap-1 ${colorClass} ${size === 'sm' ? 'text-xs px-1.5 py-0' : ''}`}
    >
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {label}
    </Badge>
  );
}
