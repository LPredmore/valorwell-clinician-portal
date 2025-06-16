
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have recovery tokens in URL params
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');
        
        console.log("[UpdatePassword] URL params:", { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
        
        // If we have tokens in URL, set the session
        if (accessToken && refreshToken && type === 'recovery') {
          console.log("[UpdatePassword] Setting session from URL tokens");
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error("[UpdatePassword] Error setting session:", error);
            setError(`Failed to verify reset link: ${error.message}`);
            setIsValidSession(false);
          } else {
            console.log("[UpdatePassword] Session set successfully");
            setIsValidSession(true);
          }
        } else {
          // Check for existing session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("[UpdatePassword] Error getting session:", error);
            setError(`Session error: ${error.message}`);
            setIsValidSession(false);
          } else if (session) {
            console.log("[UpdatePassword] Found existing session");
            setIsValidSession(true);
          } else {
            console.log("[UpdatePassword] No valid session found");
            setError("No valid reset session found. Please request a new password reset link.");
            setIsValidSession(false);
          }
        }
      } catch (error: any) {
        console.error("[UpdatePassword] Error in checkSession:", error);
        setError(`Error checking session: ${error.message}`);
        setIsValidSession(false);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate passwords
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      setError("Password too short");
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    console.log("[UpdatePassword] Starting password update process");
    setIsLoading(true);

    try {
      // Update the user's password
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error("[UpdatePassword] Error updating password:", error.message);
        setError(`Failed to update password: ${error.message}`);
        throw error;
      }

      console.log("[UpdatePassword] Password updated successfully");
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });

      // Sign out to clear the recovery session
      await supabase.auth.signOut();
      
      // Redirect to login page
      navigate("/login");
    } catch (error: any) {
      console.error("[UpdatePassword] Error details:", error);
      
      toast({
        title: "Failed to update password",
        description: error.message || "There was a problem updating your password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Verifying reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Update Password</CardTitle>
          <CardDescription className="text-center">
            {isValidSession ? 
              "Enter your new password below" : 
              "This page is for resetting your password after clicking the link in the reset email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          
          {!isValidSession && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md">
              <p className="text-sm font-medium">
                No valid reset session found. Please request a new password reset.
              </p>
              <Button
                variant="link"
                className="text-sm p-0 h-auto text-yellow-800 underline mt-2"
                onClick={() => navigate("/reset-password")}
              >
                Request a new password reset email
              </Button>
            </div>
          )}
          
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">New Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                disabled={isLoading || !isValidSession}
                className={!isValidSession ? "bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                disabled={isLoading || !isValidSession}
                className={!isValidSession ? "bg-gray-100" : ""}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !isValidSession}
            >
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" onClick={() => navigate("/login")}>
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UpdatePassword;
