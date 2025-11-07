import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useReferralCapture = () => {
  useEffect(() => {
    const captureReferralCode = async () => {
      // Check URL for ref parameter
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');
      
      if (refCode) {
        const uppercaseCode = refCode.toUpperCase();
        
        // Store in localStorage for later use during signup/checkout
        localStorage.setItem('ref_code', uppercaseCode);
        
        // Check if we already tracked this session to avoid duplicates
        const existingSessionId = localStorage.getItem('referral_session_id');
        const trackedCode = localStorage.getItem('referral_tracked_code');
        
        // Skip if already tracked this code in this session
        if (existingSessionId && trackedCode === uppercaseCode) {
          console.log('Referral already tracked for this session');
          return;
        }
        
        // Generate or reuse session ID
        const sessionId = existingSessionId || crypto.randomUUID();
        localStorage.setItem('referral_session_id', sessionId);
        localStorage.setItem('referral_tracked_code', uppercaseCode);
        
        // Track click through edge function
        try {
          const { data, error } = await supabase.functions.invoke('track-referral-click', {
            body: {
              code: uppercaseCode,
              sessionId,
              referrerUrl: document.referrer || null
            }
          });
          
          if (error) {
            console.error('Error tracking click:', error);
          } else {
            console.log('Referral click tracked:', uppercaseCode, data);
          }
        } catch (error) {
          console.error('Error tracking click:', error);
        }
        
        // Record the referral use
        try {
          // Check if code is valid and active
          const { data: codeData } = await supabase
            .from('referral_codes')
            .select('id, active, expires_at, max_uses')
            .eq('code', uppercaseCode)
            .maybeSingle();
          
          if (codeData && codeData.active) {
            // Check expiry
            if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
              console.log('Referral code expired');
              return;
            }
            
            // Check max uses if set
            if (codeData.max_uses) {
              const { count } = await supabase
                .from('referral_uses')
                .select('*', { count: 'exact', head: true })
                .eq('code_id', codeData.id);
              
              if (count !== null && count >= codeData.max_uses) {
                console.log('Referral code max uses reached');
                return;
              }
            }
            
            // Record the use with the same session ID
            await supabase
              .from('referral_uses')
              .insert({
                code_id: codeData.id,
                session_id: sessionId,
                note: `Landing page visit from ${window.location.href}`
              });
            
            console.log('Referral code captured:', uppercaseCode);
          }
        } catch (error) {
          console.error('Error capturing referral:', error);
        }
      }
    };
    
    captureReferralCode();
  }, []);
};
