import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type StaffActionType =
  | 'login'
  | 'view'
  | 'change'
  | 'impersonation'
  | 'refund'
  | 'retry'
  | 'role_change'
  | 'delete'
  | 'export'
  | 'denied';

interface LogActivityParams {
  actionType: StaffActionType;
  entityType?: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export function useStaffActivityLog() {
  const logActivity = useCallback(async ({
    actionType,
    entityType,
    entityId,
    description,
    metadata = {},
  }: LogActivityParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('staff_activity_log').insert([{
        admin_id: user.id,
        admin_email: user.email || 'unknown',
        action_type: actionType,
        entity_type: entityType || undefined,
        entity_id: entityId || undefined,
        description,
        metadata: metadata as unknown as Json,
        user_agent: navigator.userAgent,
      }]);
    } catch (error) {
      console.error('Failed to log staff activity:', error);
    }
  }, []);

  return { logActivity };
}
