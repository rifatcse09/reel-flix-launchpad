import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Key, Palette, Mail, FileText, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminSettings = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  // Theme settings
  const [primaryColor, setPrimaryColor] = useState("#ff1493");
  const [secondaryColor, setSecondaryColor] = useState("#000000");
  const [accentColor, setAccentColor] = useState("#ffffff");
  
  // Legal pages
  const [termsOfService, setTermsOfService] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");
  
  // Email templates
  const [welcomeEmail, setWelcomeEmail] = useState("");
  const [paymentConfirmation, setPaymentConfirmation] = useState("");
  const [passwordReset, setPasswordReset] = useState("");

  if (adminLoading) {
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

  const handleSaveTheme = () => {
    setSaving(true);
    // Save theme settings to localStorage or database
    localStorage.setItem('theme_primary', primaryColor);
    localStorage.setItem('theme_secondary', secondaryColor);
    localStorage.setItem('theme_accent', accentColor);
    
    toast({
      title: "Theme Saved",
      description: "Theme settings updated successfully. Reload to see changes.",
    });
    setSaving(false);
  };

  const handleSaveLegalPage = async (type: 'terms' | 'privacy' | 'refund') => {
    setSaving(true);
    try {
      const content = type === 'terms' ? termsOfService : 
                     type === 'privacy' ? privacyPolicy : 
                     refundPolicy;
      
      // Save to database (you'd need to create a settings table)
      // For now, saving to localStorage as example
      localStorage.setItem(`legal_${type}`, content);
      
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
      
      localStorage.setItem(`email_template_${type}`, template);
      
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

  const handleAddSecret = (secretName: string) => {
    toast({
      title: "Add Secret",
      description: `Please use Lovable Cloud to add ${secretName}. Check your project settings.`,
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
                  <Button onClick={() => handleAddSecret('STRIPE_SECRET_KEY')}>
                    Update Key
                  </Button>
                </div>
                
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label>Stripe Webhook Secret</Label>
                    <Input type="password" value="whsec_••••••••••••" disabled />
                  </div>
                  <Button onClick={() => handleAddSecret('STRIPE_WEBHOOK_SECRET')}>
                    Update Secret
                  </Button>
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label>PayPal Client ID</Label>
                    <Input type="password" placeholder="Not configured" disabled />
                  </div>
                  <Button onClick={() => handleAddSecret('PAYPAL_CLIENT_ID')}>
                    Add Key
                  </Button>
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
                <Button onClick={() => handleAddSecret('RESEND_API_KEY')}>
                  Add Key
                </Button>
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
                <Button onClick={() => handleAddSecret('CUSTOM_API_KEY')}>
                  Add Integration
                </Button>
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

              <Button onClick={handleSaveTheme} disabled={saving} className="w-full">
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
              <Button onClick={() => handleSaveEmailTemplate('welcome')} disabled={saving}>
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
              <Button onClick={() => handleSaveEmailTemplate('payment')} disabled={saving}>
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
              <Button onClick={() => handleSaveEmailTemplate('reset')} disabled={saving}>
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
              <Button onClick={() => handleSaveLegalPage('terms')} disabled={saving}>
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
              <Button onClick={() => handleSaveLegalPage('privacy')} disabled={saving}>
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
              <Button onClick={() => handleSaveLegalPage('refund')} disabled={saving}>
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
                  <Button variant="outline">Toggle</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Clear Cache</h4>
                    <p className="text-sm text-muted-foreground">
                      Clear system cache and temporary files
                    </p>
                  </div>
                  <Button variant="outline">Clear Cache</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Export Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Download all settings as a backup
                    </p>
                  </div>
                  <Button variant="outline">Export</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Import Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Restore settings from a backup file
                    </p>
                  </div>
                  <Button variant="outline">Import</Button>
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
              <Button variant="outline" className="w-full">
                View Database Statistics
              </Button>
              <Button variant="outline" className="w-full">
                Optimize Database
              </Button>
              <Button variant="destructive" className="w-full">
                Reset Database (Danger)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;