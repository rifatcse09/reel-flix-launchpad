import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const NotificationPreferences = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    announcements: true,
    alerts: true,
    warnings: true,
    info: true,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          announcements: data.announcements,
          alerts: data.alerts,
          warnings: data.warnings,
          info: data.info,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notification preferences saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Preferences</h1>
        <p className="text-muted-foreground">Manage which notifications you want to receive</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>In-App Notifications</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to see
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="announcements">Announcements</Label>
              <p className="text-sm text-muted-foreground">
                General announcements and updates
              </p>
            </div>
            <Switch
              id="announcements"
              checked={preferences.announcements}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, announcements: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="alerts">Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Important alerts that require attention
              </p>
            </div>
            <Switch
              id="alerts"
              checked={preferences.alerts}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, alerts: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="warnings">Warnings</Label>
              <p className="text-sm text-muted-foreground">
                Warnings about your account or subscriptions
              </p>
            </div>
            <Switch
              id="warnings"
              checked={preferences.warnings}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, warnings: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="info">Information</Label>
              <p className="text-sm text-muted-foreground">
                Helpful tips and information
              </p>
            </div>
            <Switch
              id="info"
              checked={preferences.info}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, info: checked })
              }
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationPreferences;