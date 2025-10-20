import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2, Calendar, Eye, EyeOff, Copy, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [allowSurveys, setAllowSurveys] = useState(true);
  
  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("");
  const [playerLink, setPlayerLink] = useState("");
  const [m3uLink, setM3uLink] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [subscriptionExpiry, setSubscriptionExpiry] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  
  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    username: "",
    birthday: "",
    playerLink: "",
    m3uLink: "",
    avatarUrl: ""
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      await loadProfile(session.user.id);
    }
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
      const loadedUsername = data.full_name || user?.email?.split('@')[0] || "";
      const loadedBirthday = data.birthday || "";
      const loadedPlayerLink = data.player_link || "";
      const loadedM3uLink = data.m3u_link || "";
      const loadedAvatarUrl = data.avatar_url || "";
      
      setUsername(loadedUsername);
      setBirthday(loadedBirthday);
      setPlayerLink(loadedPlayerLink);
      setM3uLink(loadedM3uLink);
      setReferralCode(data.referral_code || "");
      setAvatarUrl(loadedAvatarUrl);
      
      // Set original values for change detection
      setOriginalValues({
        username: loadedUsername,
        birthday: loadedBirthday,
        playerLink: loadedPlayerLink,
        m3uLink: loadedM3uLink,
        avatarUrl: loadedAvatarUrl
      });
    }

    // Load subscription expiry
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('ends_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subData?.ends_at) {
      const expiryDate = new Date(subData.ends_at);
      const now = new Date();
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        const months = Math.floor(diffDays / 30);
        const days = diffDays % 30;
        setSubscriptionExpiry(`${months} months and ${days} days`);
      } else {
        setSubscriptionExpiry("Expired");
      }
    } else {
      setSubscriptionExpiry("No active subscription");
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}-${Math.random()}.${fileExt}`;

    setUploading(true);
    try {
      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setOriginalValues(prev => ({ ...prev, avatarUrl: publicUrl }));

      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload profile picture",
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
          full_name: username,
          birthday: birthday || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update original values after successful save
      setOriginalValues(prev => ({
        ...prev,
        username,
        birthday
      }));

      toast({
        title: "Success",
        description: "Profile information saved successfully",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdditionalInfo = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          player_link: playerLink,
          m3u_link: m3uLink,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update original values after successful save
      setOriginalValues(prev => ({
        ...prev,
        playerLink,
        m3uLink
      }));

      toast({
        title: "Success",
        description: "Player and M3U links saved successfully",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  // Check if profile settings have changed
  const profileHasChanges = username !== originalValues.username || birthday !== originalValues.birthday;
  
  // Check if additional info has changed
  const additionalInfoHasChanges = playerLink !== originalValues.playerLink || m3uLink !== originalValues.m3uLink;


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
          <Clock className="h-4 w-4 text-accent" />
          <div>
            <p className="text-xs text-muted-foreground">Subscription expiry</p>
            <p className="text-sm font-medium">{subscriptionExpiry}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile Picture Upload */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Profile Picture</Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-accent"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-secondary border-2 border-border flex items-center justify-center">
                    <span className="text-2xl text-muted-foreground">
                      {username.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Label
                  htmlFor="avatar-upload"
                  className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2 transition-colors"
                >
                  {uploading ? "Uploading..." : "Upload Picture"}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG or WEBP. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-muted-foreground text-xs">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthday" className="text-muted-foreground text-xs">Your birthday</Label>
            <div className="relative">
              <Input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="bg-secondary border-border pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-muted-foreground text-xs">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value="••••••"
                disabled
                className="bg-secondary border-border pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button 
            onClick={handleSaveProfile}
            disabled={saving || !profileHasChanges}
            variant="cta"
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Profile Settings"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playerLink" className="text-muted-foreground text-xs">Player Link</Label>
                <div className="relative">
                  <Input
                    id="playerLink"
                    type="text"
                    value={playerLink}
                    onChange={(e) => setPlayerLink(e.target.value)}
                    placeholder="Enter player link"
                    className="bg-secondary border-border pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(playerLink, "Player Link")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="m3uLink" className="text-muted-foreground text-xs">M3U Link</Label>
                <div className="relative">
                  <Input
                    id="m3uLink"
                    type="text"
                    value={m3uLink}
                    onChange={(e) => setM3uLink(e.target.value)}
                    placeholder="Enter M3U link"
                    className="bg-secondary border-border pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(m3uLink, "M3U Link")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral" className="text-muted-foreground text-xs">My referral code</Label>
                <div className="relative">
                  <Input
                    id="referral"
                    type="text"
                    value={referralCode}
                    readOnly
                    placeholder="Loading..."
                    className="bg-secondary border-border pr-10 font-mono text-accent"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(referralCode, "Referral code")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={!referralCode}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Share this code with others to earn rewards when they subscribe
                  </p>
                  <Button
                    variant="link"
                    className="text-accent text-xs h-auto p-0"
                    onClick={() => navigate('/dashboard/referral-rewards')}
                  >
                    Track Rewards →
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleSaveAdditionalInfo}
                disabled={saving || !additionalInfoHasChanges}
                variant="cta"
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Player & M3U Links"
                )}
              </Button>

              <div className="flex items-start gap-3 pt-2">
                <Switch
                  checked={allowSurveys}
                  onCheckedChange={setAllowSurveys}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground">
                  To improve the service quality, we might call with a small survey or assistance queries. 
                  If you want to avoid receiving calls from us, uncheck here
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 p-6 bg-secondary rounded-lg border border-border">
              <div className="bg-white p-3 rounded-lg">
                <div className="w-32 h-32 bg-black flex items-center justify-center">
                  <div className="text-white text-xs text-center">QR Code</div>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Use this m3u link or scan the QR to login the application
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You are allowed to remove only <span className="text-accent font-medium">two</span> devices each week.
          </p>
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg border border-border">
            <div>
              <p className="text-xs text-muted-foreground">iPhone 13 Pro Max</p>
              <p className="text-sm font-medium">Apple</p>
            </div>
            <button className="text-muted-foreground hover:text-destructive transition-colors">
              <span className="text-2xl">−</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;