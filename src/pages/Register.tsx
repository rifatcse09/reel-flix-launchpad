import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import registerBackground from "@/assets/register-background.jpg";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().trim().email("Invalid email format").max(255, "Email must be less than 255 characters"),
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(50, "Username must be less than 50 characters").regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, dashes, and underscores"),
  phone: z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password must be less than 100 characters"),
  confirmPassword: z.string(),
  country: z.string().min(1, "Country is required"),
  state: z.string().optional(),
  birthday: z.string().optional(),
  referralCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    birthday: "",
    referralCode: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    state: "",
    phone: "",
    agreeToPolicy: false,
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    // Validate agreement first
    if (!formData.agreeToPolicy) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the privacy policy to continue.",
        variant: "destructive",
      });
      return;
    }

    function normalizePostcode(country?: string, pc?: string) {
      if (pc && pc.trim()) return pc.trim();

      switch ((country || '').toUpperCase()) {
        case 'US': return '00000';      // 5 digits
        case 'CA': return 'A1A 1A1';    // valid-format placeholder
        case 'GB': return 'SW1A 1AA';
        case 'AU': return '0000';
        default:   return '00000';      // generic fallback
      }
    }

    const postcode = normalizePostcode(formData.country);


    // Validate all inputs using zod schema
    const validationResult = registerSchema.safeParse({
      email: formData.email,
      username: formData.username,
      phone: formData.phone,
      firstName: formData.firstName,
      lastName: formData.lastName,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      country: formData.country,
      state: formData.state,
      birthday: formData.birthday,
      referralCode: formData.referralCode,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Validation Error",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check IP-based trial limit before registration
      const { data: trialCheckData, error: trialCheckError } = await supabase.functions.invoke('validate-trial-signup');
      
      if (trialCheckError) {
        console.error('Error checking trial limit:', trialCheckError);
        throw new Error('Failed to validate trial eligibility. Please try again.');
      }

      if (!trialCheckData.canSignup) {
        toast({
          title: "Trial Limit Reached",
          description: `This network has already used ${trialCheckData.maxTrials} free trials. Please purchase a subscription to continue.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create the account with Supabase Auth
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Record trial usage
        try {
          await supabase.functions.invoke('record-trial-usage', {
            body: { userId: data.user.id }
          });
        } catch (recordError) {
          console.error('Error recording trial usage:', recordError);
          // Don't block registration if trial recording fails
        }

        // Update the profile with additional registration data
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            username: formData.username,
            phone: formData.phone,
            country: formData.country,
            state: formData.state || null,
            birthday: formData.birthday || null,
            address: formData.state && formData.country 
              ? `${formData.state}, ${formData.country}` 
              : formData.country,
          })
          .eq('id', data.user.id);
        
        const address = formData.state && formData.country
          ? `${formData.state}, ${formData.country}`
          : formData.country;

        if (updateError) {
          console.error('Error updating profile:', updateError);
        }

        // Call the WHMCS trial-create function
        const trialPayload = {
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          country: formData.country,
          city: formData.state,
          postcode: postcode,
          phone: formData.phone,
          address1: address,
          password: formData.password,
        };

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trial-create`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(trialPayload),
          }
        );

        const trialResponse = await res.json();
        console.log("Trial created:", trialResponse);

        // Step 4: Optionally update profile with WHMCS client_id
        if (trialResponse.clientId) {
          const now = new Date();
          const trialEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          await supabase.from("profiles").update({
            whmcs_client_id: trialResponse.clientId,
            trial_used: true,
            trial_started_at: now.toISOString(),
            trial_ends_at: trialEnd.toISOString(),
          }).eq("id", data.user.id);
        }

        toast({
          title: "Account Created",
          description: "Your account has been successfully created!",
        });

        // Navigate to dashboard
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div 
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${registerBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/85 to-background/90"></div>
      </div>
      
      <div className="relative z-10">
        <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold text-foreground">Registration</h1>
          </div>
          
          <div className="bg-card rounded-lg shadow-lg p-8 space-y-8">
            {/* Personal Information */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-6">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="birthday">Your birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => handleInputChange("birthday", e.target.value)}
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="referralCode">Referral Code OR Promo Code</Label>
                  <Input
                    id="referralCode"
                    value={formData.referralCode}
                    onChange={(e) => handleInputChange("referralCode", e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-6">Contact Information</h2>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="bg-background"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="bg-background"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className="bg-background"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="country">Select Country</Label>
                    <Select value={formData.country} onValueChange={(value) => handleInputChange("country", value)}>
                      <SelectTrigger id="country" className="bg-background">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="ca">Canada</SelectItem>
                        <SelectItem value="uk">United Kingdom</SelectItem>
                        <SelectItem value="au">Australia</SelectItem>
                        <SelectItem value="de">Germany</SelectItem>
                        <SelectItem value="fr">France</SelectItem>
                        <SelectItem value="es">Spain</SelectItem>
                        <SelectItem value="it">Italy</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select value={formData.state} onValueChange={(value) => handleInputChange("state", value)}>
                      <SelectTrigger id="state" className="bg-background">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AL">Alabama</SelectItem>
                        <SelectItem value="AK">Alaska</SelectItem>
                        <SelectItem value="AZ">Arizona</SelectItem>
                        <SelectItem value="AR">Arkansas</SelectItem>
                        <SelectItem value="CA">California</SelectItem>
                        <SelectItem value="CO">Colorado</SelectItem>
                        <SelectItem value="CT">Connecticut</SelectItem>
                        <SelectItem value="DE">Delaware</SelectItem>
                        <SelectItem value="FL">Florida</SelectItem>
                        <SelectItem value="GA">Georgia</SelectItem>
                        <SelectItem value="HI">Hawaii</SelectItem>
                        <SelectItem value="ID">Idaho</SelectItem>
                        <SelectItem value="IL">Illinois</SelectItem>
                        <SelectItem value="IN">Indiana</SelectItem>
                        <SelectItem value="IA">Iowa</SelectItem>
                        <SelectItem value="KS">Kansas</SelectItem>
                        <SelectItem value="KY">Kentucky</SelectItem>
                        <SelectItem value="LA">Louisiana</SelectItem>
                        <SelectItem value="ME">Maine</SelectItem>
                        <SelectItem value="MD">Maryland</SelectItem>
                        <SelectItem value="MA">Massachusetts</SelectItem>
                        <SelectItem value="MI">Michigan</SelectItem>
                        <SelectItem value="MN">Minnesota</SelectItem>
                        <SelectItem value="MS">Mississippi</SelectItem>
                        <SelectItem value="MO">Missouri</SelectItem>
                        <SelectItem value="MT">Montana</SelectItem>
                        <SelectItem value="NE">Nebraska</SelectItem>
                        <SelectItem value="NV">Nevada</SelectItem>
                        <SelectItem value="NH">New Hampshire</SelectItem>
                        <SelectItem value="NJ">New Jersey</SelectItem>
                        <SelectItem value="NM">New Mexico</SelectItem>
                        <SelectItem value="NY">New York</SelectItem>
                        <SelectItem value="NC">North Carolina</SelectItem>
                        <SelectItem value="ND">North Dakota</SelectItem>
                        <SelectItem value="OH">Ohio</SelectItem>
                        <SelectItem value="OK">Oklahoma</SelectItem>
                        <SelectItem value="OR">Oregon</SelectItem>
                        <SelectItem value="PA">Pennsylvania</SelectItem>
                        <SelectItem value="RI">Rhode Island</SelectItem>
                        <SelectItem value="SC">South Carolina</SelectItem>
                        <SelectItem value="SD">South Dakota</SelectItem>
                        <SelectItem value="TN">Tennessee</SelectItem>
                        <SelectItem value="TX">Texas</SelectItem>
                        <SelectItem value="UT">Utah</SelectItem>
                        <SelectItem value="VT">Vermont</SelectItem>
                        <SelectItem value="VA">Virginia</SelectItem>
                        <SelectItem value="WA">Washington</SelectItem>
                        <SelectItem value="WV">West Virginia</SelectItem>
                        <SelectItem value="WI">Wisconsin</SelectItem>
                        <SelectItem value="WY">Wyoming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <div className="flex gap-2">
                    <Select defaultValue="us">
                      <SelectTrigger className="w-24 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">🇺🇸 +1</SelectItem>
                        <SelectItem value="ca">🇨🇦 +1</SelectItem>
                        <SelectItem value="uk">🇬🇧 +44</SelectItem>
                        <SelectItem value="au">🇦🇺 +61</SelectItem>
                        <SelectItem value="de">🇩🇪 +49</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="flex-1 bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Policy Agreement */}
            <div className="flex items-start gap-2">
              <Checkbox
                id="privacy"
                checked={formData.agreeToPolicy}
                onCheckedChange={(checked) => handleInputChange("agreeToPolicy", checked === true)}
              />
              <Label htmlFor="privacy" className="text-sm cursor-pointer">
                I agree to the terms and conditions and accept all{" "}
                <a href="#" className="text-primary hover:underline">
                  privacy policies
                </a>
              </Label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="cta"
                onClick={handleRegister}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Register"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Register;
