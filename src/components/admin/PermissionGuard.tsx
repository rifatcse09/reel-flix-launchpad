import { ReactNode } from "react";
import { usePermissions, type Permission } from "@/hooks/usePermissions";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert } from "lucide-react";

interface PermissionGuardProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
  destructive?: boolean;
}

export function PermissionGuard({ permission, children, fallback, destructive }: PermissionGuardProps) {
  const { hasPermission } = usePermissions();
  const { isDestructiveBlocked } = useImpersonation();

  if (destructive && isDestructiveBlocked) {
    return fallback || null;
  }

  if (!hasPermission(permission)) {
    return fallback || null;
  }

  return <>{children}</>;
}

/**
 * Hook that returns a guarded action handler.
 * If the user lacks permission, it logs the denial and shows a toast.
 */
export function useGuardedAction() {
  const { hasPermission, role } = usePermissions();
  const { isDestructiveBlocked } = useImpersonation();
  const { toast } = useToast();

  const guardAction = async (
    permission: Permission,
    action: () => Promise<void> | void,
    options?: { destructive?: boolean; actionLabel?: string }
  ) => {
    if (options?.destructive && isDestructiveBlocked) {
      toast({
        title: "Blocked",
        description: "Destructive actions are blocked during impersonation.",
        variant: "destructive",
      });
      return;
    }

    if (!hasPermission(permission)) {
      toast({
        title: "Access Denied",
        description: `You don't have permission to ${options?.actionLabel || 'perform this action'}.`,
        variant: "destructive",
      });

      // Log the denied attempt
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('admin_notes').insert({
            entity_type: 'access_denied',
            entity_id: user.id,
            admin_id: user.id,
            admin_name: user.email || 'Unknown',
            content: `Denied: ${permission} (role: ${role}) — ${options?.actionLabel || 'unknown action'}`,
          });
        }
      } catch (e) {
        console.error('Failed to log denied action:', e);
      }
      return;
    }

    await action();
  };

  return { guardAction };
}
