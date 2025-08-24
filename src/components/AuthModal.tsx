import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { TOTPVerification } from "./TOTPVerification";
import { Mail, Lock, User, Chrome } from "lucide-react";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle, requiresMFA, completeMFASignIn, cancelMFASignIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [signInForm, setSignInForm] = useState({ email: "", password: "" });
  const [signUpForm, setSignUpForm] = useState({ 
    email: "", 
    password: "", 
    confirmPassword: "", 
    displayName: "" 
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInForm.email || !signInForm.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await signIn(signInForm.email, signInForm.password);
      // Don't close the modal yet - MFA might be required
      if (!requiresMFA) {
        onOpenChange(false);
        setSignInForm({ email: "", password: "" });
      }
    } catch (error) {
      // Error is handled in the context
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpForm.email || !signUpForm.password || !signUpForm.displayName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (signUpForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await signUp(signUpForm.email, signUpForm.password, signUpForm.displayName);
      onOpenChange(false);
      setSignUpForm({ email: "", password: "", confirmPassword: "", displayName: "" });
    } catch (error) {
      // Error is handled in the context
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Don't close the modal yet - MFA might be required
      if (!requiresMFA) {
        onOpenChange(false);
      }
    } catch (error) {
      // Error is handled in the context
    } finally {
      setLoading(false);
    }
  };

  const handleMFASuccess = () => {
    completeMFASignIn();
    onOpenChange(false);
    setSignInForm({ email: "", password: "" });
  };

  const handleMFACancel = () => {
    cancelMFASignIn();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-gradient">
            Welcome to ROTZ.AI
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <div className="text-center mb-4">
              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full mb-4 flex items-center gap-2"
              >
                <Chrome className="h-4 w-4" />
                Continue with Google
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={signInForm.email}
                  onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={signInForm.password}
                  onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <div className="text-center mb-4">
              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full mb-4 flex items-center gap-2"
              >
                <Chrome className="h-4 w-4" />
                Continue with Google
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or create account with email
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Display Name
                </Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Enter your name"
                  value={signUpForm.displayName}
                  onChange={(e) => setSignUpForm({ ...signUpForm, displayName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={signUpForm.email}
                  onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password (min 6 characters)"
                  value={signUpForm.password}
                  onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Confirm Password
                </Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  placeholder="Confirm your password"
                  value={signUpForm.confirmPassword}
                  onChange={(e) => setSignUpForm({ ...signUpForm, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="text-center text-sm text-muted-foreground mt-4">
          Your data is securely stored and synced across devices
        </div>
      </DialogContent>
      
      {/* TOTP Verification Modal */}
      <TOTPVerification
        open={requiresMFA}
        onOpenChange={() => {}} // Prevent closing via backdrop
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
        title="Two-Factor Authentication Required"
        description="Please complete authentication with your authenticator app"
      />
    </Dialog>
  );
}