import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/reelflix-logo.png";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for auth state changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Detect password recovery mode first
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        return; // Don't redirect, show password reset form
      }
      
      if (event === 'SIGNED_IN' && session && !isPasswordRecovery) {
        navigate("/dashboard");
      }
    });

    // Then check if user is already logged in
    const checkSession = async () => {
      // Check URL hash for password recovery token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const isRecovery = hashParams.get('type') === 'recovery';
      
      if (isRecovery) {
        setIsPasswordRecovery(true);
        return; // Don't redirect, show password reset form
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !isRecovery) {
        navigate("/dashboard");
      }
    };
    
    checkSession();

    return () => subscription.unsubscribe();
  }, [navigate, isPasswordRecovery]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "Check your email for a link to reset your password.",
      });
      setResetPasswordMode(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while sending the reset email.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password updated!",
        description: "Your password has been successfully reset.",
      });
      
      setIsPasswordRecovery(false);
      setNewPassword("");
      setConfirmPassword("");
      navigate("/dashboard");
    } catch (error: any) {
      console.error('Password update error:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating your password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log('Auth attempt started:', { isLogin, email });

    try {
      if (isLogin) {
        console.log('Attempting login with email length:', email.trim().length, 'password length:', password.trim().length);
        const { error, data } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        
        console.log('Login response:', { error: error?.message, hasData: !!data });
        
        if (error) {
          console.error('Login failed:', error.message);
          throw error;
        }

        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError || !profile) {
          // Profile doesn't exist - sign them out
          await supabase.auth.signOut();
          throw new Error('This account has been deleted. Please contact support if you believe this is an error.');
        }
        
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
      } else {
        console.log('Attempting signup...');
        const { error, data } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth?mode=login`,
            data: {
              full_name: fullName.trim(),
            },
          },
        });
        
        console.log('Signup response:', { error, data });
        
        if (error) throw error;

        // Trigger trial creation in background (don't wait for it)
        if (data.user) {
          console.log('Triggering background trial creation for user:', data.user.id);
          supabase.functions.invoke('trial-create', {
            body: {
              email: email.trim(),
              first_name: fullName.trim().split(' ')[0] || '',
              last_name: fullName.trim().split(' ').slice(1).join(' ') || '',
              password: password.trim(),
            }
          }).then(response => {
            console.log('Trial creation response:', response);
          }).catch(err => {
            console.error('Trial creation background error:', err);
          });
        }
        
        toast({
          title: "Account created!",
          description: "Welcome! Your trial is being set up in the background.",
        });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred during authentication.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="absolute left-4 top-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex justify-center w-full">
              <img src={logo} alt="ReelFlix" className="h-16 w-auto" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {isPasswordRecovery 
              ? "Set New Password" 
              : (resetPasswordMode ? "Reset Password" : (isLogin ? "Welcome Back" : "Create Account"))}
          </CardTitle>
          <CardDescription>
            {isPasswordRecovery
              ? "Enter your new password below"
              : (resetPasswordMode 
                ? "Enter your email to receive a password reset link" 
                : (isLogin ? "Sign in to access your account" : "Sign up to get started with ReelFlix"))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPasswordRecovery ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" variant="cta" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          ) : (
            <form onSubmit={resetPasswordMode ? handlePasswordReset : handleAuth} className="space-y-4">
            {!isLogin && !resetPasswordMode && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            {!resetPasswordMode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setResetPasswordMode(true)}
                      className="text-xs text-accent hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" variant="cta" disabled={loading}>
              {loading ? "Please wait..." : (resetPasswordMode ? "Send Reset Link" : (isLogin ? "Sign In" : "Create Account"))}
            </Button>
          </form>
          )}
          
          {!isPasswordRecovery && (
            <div className="mt-4 text-center text-sm space-y-2">
              {resetPasswordMode ? (
                <button
                  type="button"
                  onClick={() => setResetPasswordMode(false)}
                  className="text-accent hover:underline"
                >
                  Back to sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => isLogin ? navigate('/register') : setIsLogin(true)}
                  className="text-accent hover:underline"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
