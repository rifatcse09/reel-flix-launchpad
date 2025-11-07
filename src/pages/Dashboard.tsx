import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Camera, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [trialStatus, setTrialStatus] = useState<'active' | 'expired' | 'not_started' | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [creatingTrial, setCreatingTrial] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/auth?mode=login');
      return;
    }

    setUser(session.user);
    await loadProfile(session.user.id);
    setLoading(false);
  };

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }

    if (data) {
      setFullName(data.full_name || "");
      setAddress(data.address || "");
      setAvatarUrl(data.avatar_url || "");
      
      // Check trial status
      if (data.trial_ends_at) {
        const trialEnd = new Date(data.trial_ends_at);
        const now = new Date();
        if (trialEnd > now) {
          setTrialStatus('active');
          setTrialEndsAt(data.trial_ends_at);
        } else {
          setTrialStatus('expired');
        }
      } else if (data.trial_used) {
        setTrialStatus('expired');
      } else {
        setTrialStatus('not_started');
      }
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(data.publicUrl);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Profile picture updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          address: address,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully!",
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.[0].toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

        {/* Trial Status Card */}
        {trialStatus === 'not_started' && (
          <Card className="mb-6 border-accent">
            <CardHeader>
              <CardTitle>Trial Not Started</CardTitle>
              <CardDescription>
                Your trial setup is still in progress or failed. Click below to start your trial.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="cta"
                onClick={async () => {
                  if (!user) return;
                  setCreatingTrial(true);
                  try {
                    const { data: profile } = await supabase
                      .from('profiles')
                      .select('full_name, email')
                      .eq('id', user.id)
                      .single();

                    const response = await supabase.functions.invoke('trial-create', {
                      body: {
                        email: profile?.email || user.email,
                        first_name: profile?.full_name?.split(' ')[0] || '',
                        last_name: profile?.full_name?.split(' ').slice(1).join(' ') || '',
                      }
                    });

                    if (response.error) throw response.error;

                    toast({
                      title: "Trial started!",
                      description: "Your trial has been activated successfully.",
                    });

                    await loadProfile(user.id);
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to start trial",
                      variant: "destructive",
                    });
                  } finally {
                    setCreatingTrial(false);
                  }
                }}
                disabled={creatingTrial}
              >
                {creatingTrial ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Trial...
                  </>
                ) : (
                  "Start 24h Free Trial"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {trialStatus === 'active' && trialEndsAt && (
          <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-300">Trial Active</CardTitle>
              <CardDescription className="text-green-600 dark:text-green-400">
                Your trial expires on {new Date(trialEndsAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 bg-accent text-accent-foreground rounded-full p-2 cursor-pointer hover:bg-accent/90 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Click the camera icon to upload a new photo</p>
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your address"
                />
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full"
                variant="cta"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={!newPassword || !confirmPassword}
                className="w-full"
              >
                Update Password
              </Button>

              <p className="text-sm text-muted-foreground">
                Note: For security reasons, passwords cannot be viewed. You can only change your password.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;