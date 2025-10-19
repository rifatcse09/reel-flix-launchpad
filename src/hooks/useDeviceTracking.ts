import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Function to detect device type from user agent
const detectDeviceType = (): string => {
  const ua = navigator.userAgent.toLowerCase();
  
  // Check for Smart TV
  if (/(smart-tv|smarttv|googletv|appletv|roku|chromecast|firetv)/i.test(ua)) {
    return 'smart_tv';
  }
  
  // Check for Mobile
  if (/(android|iphone|ipod|blackberry|windows phone|mobile)/i.test(ua)) {
    return 'mobile';
  }
  
  // Check for Tablet
  if (/(ipad|tablet|kindle)/i.test(ua)) {
    return 'tablet';
  }
  
  // Default to Desktop
  return 'desktop';
};

// Function to detect browser
const detectBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  return 'Unknown';
};

// Function to detect OS
const detectOS = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return 'Unknown';
};

export const useDeviceTracking = () => {
  useEffect(() => {
    const trackSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const deviceType = detectDeviceType();
        const browser = detectBrowser();
        const os = detectOS();
        const userAgent = navigator.userAgent;

        // Check if session exists for this device
        const { data: existingSessions } = await supabase
          .from('user_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('device_type', deviceType)
          .eq('browser', browser)
          .maybeSingle();

        if (existingSessions) {
          // Update existing session
          await supabase
            .from('user_sessions')
            .update({
              last_accessed_at: new Date().toISOString(),
            })
            .eq('id', existingSessions.id);
        } else {
          // Create new session
          await supabase
            .from('user_sessions')
            .insert({
              user_id: user.id,
              device_type: deviceType,
              browser,
              os,
              user_agent: userAgent,
            });
        }
      } catch (error) {
        console.error('Error tracking device session:', error);
      }
    };

    trackSession();

    // Update session every 5 minutes
    const interval = setInterval(trackSession, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
};