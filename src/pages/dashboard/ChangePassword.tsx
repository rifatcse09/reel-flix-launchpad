import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ChangePassword = () => {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "", color: "" });
  const [validationError, setValidationError] = useState("");

  const calculatePasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: "", color: "" };
    
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 20;
    if (/\d/.test(password)) score += 20;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;
    
    let label = "";
    let color = "";
    if (score < 40) {
      label = "Weak";
      color = "hsl(var(--destructive))";
    } else if (score < 70) {
      label = "Medium";
      color = "hsl(var(--warning))";
    } else {
      label = "Strong";
      color = "hsl(var(--success))";
    }
    
    return { score, label, color };
  };

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(newPassword));
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      setValidationError("Passwords don't match");
    } else if (newPassword && newPassword.length < 8) {
      setValidationError("Password must be at least 8 characters");
    } else {
      setValidationError("");
    }
  }, [newPassword, confirmPassword]);

  const handleChangePassword = async () => {
    if (validationError) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "✅ Password updated successfully!",
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Change password</h1>
        <p className="text-muted-foreground mt-2">Update your account password</p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Update Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
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
              minLength={8}
            />
            {newPassword && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">🔒 Password strength:</span>
                  <span style={{ color: passwordStrength.color }} className="font-medium">
                    {passwordStrength.label}
                  </span>
                </div>
                <Progress 
                  value={passwordStrength.score} 
                  className="h-1.5"
                  style={{ 
                    // @ts-ignore
                    '--progress-color': passwordStrength.color 
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              minLength={8}
            />
            {validationError && confirmPassword && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={!newPassword || !confirmPassword || !!validationError || isLoading}
            variant="cta"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              "Update Password"
            )}
          </Button>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Note: For security reasons, passwords cannot be viewed. You can only change your password.
            </p>
            <p className="flex items-start gap-1">
              <span>💡</span>
              <span>Tip: Avoid using your streaming account password for other sites.</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;