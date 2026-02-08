import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ImpersonationState {
  isImpersonating: boolean;
  targetUserId: string | null;
  targetEmail: string | null;
  targetName: string | null;
}

interface ImpersonationContextType extends ImpersonationState {
  startImpersonation: (userId: string, email: string, name: string | null) => Promise<void>;
  stopImpersonation: () => void;
  isDestructiveBlocked: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  isImpersonating: false,
  targetUserId: null,
  targetEmail: null,
  targetName: null,
  startImpersonation: async () => {},
  stopImpersonation: () => {},
  isDestructiveBlocked: false,
});

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImpersonationState>({
    isImpersonating: false,
    targetUserId: null,
    targetEmail: null,
    targetName: null,
  });

  const startImpersonation = useCallback(async (userId: string, email: string, name: string | null) => {
    // Log the impersonation event
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // We can't insert directly due to RLS (system_event_log blocks client inserts),
      // so we log on the client for now and use admin_notes as the audit trail
      await supabase.from('admin_notes').insert({
        entity_type: 'impersonation',
        entity_id: userId,
        admin_id: user.id,
        admin_name: user.email || 'Unknown',
        content: `Started impersonating user ${email}`,
      });
    }

    setState({
      isImpersonating: true,
      targetUserId: userId,
      targetEmail: email,
      targetName: name,
    });
  }, []);

  const stopImpersonation = useCallback(async () => {
    if (state.targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_notes').insert({
          entity_type: 'impersonation',
          entity_id: state.targetUserId,
          admin_id: user.id,
          admin_name: user.email || 'Unknown',
          content: `Stopped impersonating user ${state.targetEmail}`,
        });
      }
    }

    setState({
      isImpersonating: false,
      targetUserId: null,
      targetEmail: null,
      targetName: null,
    });
  }, [state.targetUserId, state.targetEmail]);

  return (
    <ImpersonationContext.Provider
      value={{
        ...state,
        startImpersonation,
        stopImpersonation,
        isDestructiveBlocked: state.isImpersonating,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export const useImpersonation = () => useContext(ImpersonationContext);
