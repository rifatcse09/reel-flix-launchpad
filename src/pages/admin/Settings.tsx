import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Key, Palette, Mail, FileText, Settings2, Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminSettings = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [databaseStats, setDatabaseStats] = useState<Array<{ table: string; count: number }>>([]);
  
  // Theme settings
  const [primaryColor, setPrimaryColor] = useState("#ff1493");
  const [secondaryColor, setSecondaryColor] = useState("#000000");
  const [accentColor, setAccentColor] = useState("#ffffff");
  
  // System settings
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  // Legal pages
  const [termsOfService, setTermsOfService] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");
  
  // Email templates
  const [welcomeEmail, setWelcomeEmail] = useState("");
  const [welcomeSubject, setWelcomeSubject] = useState("Welcome to ReelFlix!");
  const [paymentConfirmation, setPaymentConfirmation] = useState("");
  const [paymentSubject, setPaymentSubject] = useState("Payment Received - Thank You!");
  const [passwordReset, setPasswordReset] = useState("");
  const [resetSubject, setResetSubject] = useState("Reset Your Password");

  // Load settings from database
  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_settings' as any)
        .select('*') as any;
      
      if (error) throw error;
      
      if (data && Array.isArray(data)) {
        data.forEach((setting: any) => {
          const value = setting.value;
          switch (setting.key) {
            case 'theme_primary':
              setPrimaryColor(value as string);
              break;
            case 'theme_secondary':
              setSecondaryColor(value as string);
              break;
            case 'theme_accent':
              setAccentColor(value as string);
              break;
            case 'maintenance_mode':
              setMaintenanceMode(value as boolean);
              break;
            case 'terms_of_service':
              setTermsOfService(value as string);
              break;
            case 'privacy_policy':
              setPrivacyPolicy(value as string);
              break;
            case 'refund_policy':
              setRefundPolicy(value as string);
              break;
            case 'email_welcome':
              setWelcomeEmail(value as string);
              break;
            case 'email_welcome_subject':
              setWelcomeSubject(value as string);
              break;
            case 'email_payment':
              setPaymentConfirmation(value as string);
              break;
            case 'email_payment_subject':
              setPaymentSubject(value as string);
              break;
            case 'email_reset':
              setPasswordReset(value as string);
              break;
            case 'email_reset_subject':
              setResetSubject(value as string);
              break;
          }
        });
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any, category: string) => {
    const { data: session } = await supabase.auth.getSession();
    const { error } = await supabase
      .from('app_settings' as any)
      .upsert({
        key,
        value,
        category,
        updated_by: session.session?.user.id
      }, { onConflict: 'key' });
    
    if (error) throw error;
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate('/dashboard/profile');
    return null;
  }

  const handleSaveTheme = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting('theme_primary', primaryColor, 'theme'),
        updateSetting('theme_secondary', secondaryColor, 'theme'),
        updateSetting('theme_accent', accentColor, 'theme')
      ]);
      
      // Apply theme changes to CSS variables
      document.documentElement.style.setProperty('--primary', primaryColor);
      document.documentElement.style.setProperty('--secondary', secondaryColor);
      document.documentElement.style.setProperty('--accent', accentColor);
      
      toast({
        title: "Theme Saved",
        description: "Theme settings updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save theme",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLegalPage = async (type: 'terms' | 'privacy' | 'refund') => {
    setSaving(true);
    try {
      const content = type === 'terms' ? termsOfService : 
                     type === 'privacy' ? privacyPolicy : 
                     refundPolicy;
      
      const key = type === 'terms' ? 'terms_of_service' :
                  type === 'privacy' ? 'privacy_policy' :
                  'refund_policy';
      
      await updateSetting(key, content, 'legal');
      
      toast({
        title: "Saved",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} page saved successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save page",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmailTemplate = async (type: string) => {
    setSaving(true);
    try {
      const template = type === 'welcome' ? welcomeEmail : 
                      type === 'payment' ? paymentConfirmation : 
                      passwordReset;
      
      const subject = type === 'welcome' ? welcomeSubject :
                     type === 'payment' ? paymentSubject :
                     resetSubject;
      
      await Promise.all([
        updateSetting(`email_${type}`, template, 'email'),
        updateSetting(`email_${type}_subject`, subject, 'email')
      ]);
      
      toast({
        title: "Template Saved",
        description: `${type} email template saved successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };


  const handleToggleMaintenanceMode = async () => {
    try {
      const newValue = !maintenanceMode;
      await updateSetting('maintenance_mode', newValue, 'system');
      setMaintenanceMode(newValue);
      toast({
        title: newValue ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
        description: newValue ? "Application is now in maintenance mode" : "Application is now live",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle maintenance mode",
        variant: "destructive"
      });
    }
  };

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast({
      title: "Cache Cleared",
      description: "All cached data has been cleared",
    });
  };

  const handleExportSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings' as any)
        .select('*');
      
      if (error) throw error;
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-backup-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Settings Exported",
        description: "Settings have been exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export settings",
        variant: "destructive"
      });
    }
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const settings = JSON.parse(text);
        
        for (const setting of settings) {
          await updateSetting(setting.key, setting.value, setting.category);
        }
        
        await loadSettings();
        
        toast({
          title: "Settings Imported",
          description: "Settings have been imported successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to import settings",
          variant: "destructive"
        });
      }
    };
    input.click();
  };

  const handleViewDatabaseStats = async () => {
    try {
      const tables = ['profiles', 'subscriptions', 'notifications', 'referral_codes', 'user_sessions'];
      const stats = await Promise.all(
        tables.map(async (table) => {
          const { count } = await supabase
            .from(table as any)
            .select('*', { count: 'exact', head: true });
          return { table, count: count || 0 };
        })
      );
      
      setDatabaseStats(stats);
      setShowStatsDialog(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch database statistics",
        variant: "destructive"
      });
    }
  };

  const handleResetDatabase = async () => {
    setShowResetDialog(false);
    toast({
      title: "Action Required",
      description: "Database reset must be performed through your backend management interface for security",
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">Configure your application settings and integrations</p>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="integrations" className="gap-2">
            <Key className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-2">
            <Palette className="h-4 w-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <FileText className="h-4 w-4" />
            Legal Pages
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateway Keys</CardTitle>
              <CardDescription>
                Manage your payment processing integrations securely
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label>Stripe Secret Key</Label>
                    <Input type="password" value="sk_••••••••••••••••" disabled />
                  </div>
                  <Button variant="cta">Update Key</Button>
                </div>
                
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label>Stripe Webhook Secret</Label>
                    <Input type="password" value="whsec_••••••••••••" disabled />
                  </div>
                  <Button variant="cta">Update Secret</Button>
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label>PayPal Client ID</Label>
                    <Input type="password" placeholder="Not configured" disabled />
                  </div>
                  <Button variant="cta">Add Key</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Service</CardTitle>
              <CardDescription>
                Configure email sending service (Resend)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label>Resend API Key</Label>
                  <Input type="password" placeholder="Not configured" disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get your API key from resend.com
                  </p>
                </div>
                <Button variant="cta">Add Key</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Other Integrations</CardTitle>
              <CardDescription>
                Manage additional API keys and services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label>Custom API Key</Label>
                  <Input placeholder="Enter API key name" />
                </div>
                <Button variant="cta">Add Integration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Colors</CardTitle>
              <CardDescription>
                Customize your application's color scheme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#ff1493"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Main brand color</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#000000"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Background color</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent-color"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#ffffff"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Text/accent color</p>
                </div>
              </div>

              <div className="p-6 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-4">Preview</h3>
                <div className="space-y-2">
                  <div 
                    className="h-12 rounded flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Primary Color
                  </div>
                  <div 
                    className="h-12 rounded flex items-center justify-center font-medium"
                    style={{ backgroundColor: secondaryColor, color: accentColor }}
                  >
                    Secondary with Accent Text
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveTheme} disabled={saving} variant="cta" className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Theme"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Welcome Email</CardTitle>
              <CardDescription>
                Email sent to new users upon registration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcome-subject">Subject Line</Label>
                <Input 
                  id="welcome-subject"
                  value={welcomeSubject}
                  onChange={(e) => setWelcomeSubject(e.target.value)}
                  placeholder="Welcome to ReelFlix!"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcome-body">Email Body (HTML supported)</Label>
                <Textarea
                  id="welcome-body"
                  value={welcomeEmail}
                  onChange={(e) => setWelcomeEmail(e.target.value)}
                  placeholder="<h1>Welcome!</h1><p>Thank you for joining ReelFlix...</p>"
                  rows={8}
                />
              </div>
              <Button onClick={() => handleSaveEmailTemplate('welcome')} disabled={saving} variant="cta">
                Save Template
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Confirmation</CardTitle>
              <CardDescription>
                Email sent after successful payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-subject">Subject Line</Label>
                <Input 
                  id="payment-subject"
                  value={paymentSubject}
                  onChange={(e) => setPaymentSubject(e.target.value)}
                  placeholder="Payment Received - Thank You!"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-body">Email Body</Label>
                <Textarea
                  id="payment-body"
                  value={paymentConfirmation}
                  onChange={(e) => setPaymentConfirmation(e.target.value)}
                  placeholder="Your payment has been received..."
                  rows={8}
                />
              </div>
              <Button onClick={() => handleSaveEmailTemplate('payment')} disabled={saving} variant="cta">
                Save Template
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password Reset</CardTitle>
              <CardDescription>
                Email sent when users request password reset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-subject">Subject Line</Label>
                <Input 
                  id="reset-subject"
                  value={resetSubject}
                  onChange={(e) => setResetSubject(e.target.value)}
                  placeholder="Reset Your Password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-body">Email Body</Label>
                <Textarea
                  id="reset-body"
                  value={passwordReset}
                  onChange={(e) => setPasswordReset(e.target.value)}
                  placeholder="Click the link below to reset your password..."
                  rows={8}
                />
              </div>
              <Button onClick={() => handleSaveEmailTemplate('reset')} disabled={saving} variant="cta">
                Save Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal Pages Tab */}
        <TabsContent value="legal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Terms of Service</CardTitle>
              <CardDescription>
                Your application's terms and conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={termsOfService}
                onChange={(e) => setTermsOfService(e.target.value)}
                placeholder="Enter your terms of service..."
                rows={12}
              />
              <Button onClick={() => handleSaveLegalPage('terms')} disabled={saving} variant="cta">
                Save Terms of Service
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy Policy</CardTitle>
              <CardDescription>
                How you handle user data and privacy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={privacyPolicy}
                onChange={(e) => setPrivacyPolicy(e.target.value)}
                placeholder="Enter your privacy policy..."
                rows={12}
              />
              <Button onClick={() => handleSaveLegalPage('privacy')} disabled={saving} variant="cta">
                Save Privacy Policy
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Refund Policy</CardTitle>
              <CardDescription>
                Your refund and cancellation terms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={refundPolicy}
                onChange={(e) => setRefundPolicy(e.target.value)}
                placeholder="Enter your refund policy..."
                rows={12}
              />
              <Button onClick={() => handleSaveLegalPage('refund')} disabled={saving} variant="cta">
                Save Refund Policy
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>
                Advanced settings and maintenance options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Maintenance Mode</h4>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable access to the application
                    </p>
                  </div>
                  <Switch
                    checked={maintenanceMode}
                    onCheckedChange={handleToggleMaintenanceMode}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Clear Cache</h4>
                    <p className="text-sm text-muted-foreground">
                      Clear system cache and temporary files
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleClearCache}>Clear Cache</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Export Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Download all settings as a backup
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleExportSettings}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Import Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Restore settings from a backup file
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleImportSettings}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Database Management</CardTitle>
              <CardDescription>
                Database maintenance and optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" onClick={handleViewDatabaseStats}>
                View Database Statistics
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Optimize Database
              </Button>
              <Button 
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => setShowResetDialog(true)}
              >
                Reset Database (Danger)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all data from your database.
              For security reasons, this operation must be performed through your backend management interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetDatabase}>
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Database Statistics</AlertDialogTitle>
            <AlertDialogDescription>
              Current record counts for database tables
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            {databaseStats.map((stat) => (
              <div key={stat.table} className="flex justify-between items-center border-b pb-2">
                <span className="font-medium capitalize">{stat.table.replace(/_/g, ' ')}</span>
                <span className="text-muted-foreground">{stat.count} records</span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminSettings;