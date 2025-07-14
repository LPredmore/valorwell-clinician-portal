
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { debugAuthOperation } from "@/debug/authDebugUtils";

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("[UpdatePassword] Checking session for password reset...");
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("[UpdatePassword] Session error:", sessionError);
          setError(`Session error: ${sessionError.message}`);
          setDebugInfo(prev => ({
            ...prev,
            sessionError: {
              status: 'error',
              message: sessionError.message,
              timestamp: new Date().toISOString()
            }
          }));
          return;
        }

        if (session?.user) {
          console.log("[UpdatePassword] Active session found:", { 
            id: session.user.id, 
            email: session.user.email,
            hasSession: true
          });
          setUser(session.user);
          setHasValidSession(true);
          
          setDebugInfo(prev => ({
            ...prev,
            sessionCheck: {
              status: 'success',
              message: 'Valid recovery session found',
              userId: session.user.id,
              userEmail: session.user.email,
              timestamp: new Date().toISOString()
            }
          }));
        } else {
          console.log("[UpdatePassword] No active session found");
          setHasValidSession(false);
          setError("No active recovery session found. The reset link may have expired or been used already.");
          setDebugInfo(prev => ({
            ...prev,
            sessionCheck: {
              status: 'warning',
              message: 'No active recovery session found',
              timestamp: new Date().toISOString()
            }
          }));
        }
      } catch (error: any) {
        console.error("[UpdatePassword] Error in checkSession:", error);
        setHasValidSession(false);
        setError(`Error checking session: ${error.message}`);
        setDebugInfo(prev => ({
          ...prev,
          checkError: {
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        }));
      }
    };

    checkSession();
  }, []);

  const signOutBeforeReset = async () => {
    try {
      console.log("[UpdatePassword] Signing out current user before password reset");
      
      // Use global sign out to ensure complete token removal
      await supabase.auth.signOut({ scope: 'global' });
      
      // Wait a moment for the auth system to sync
      await new Promise(resolve => setTimeout(resolve, 500));
      
      window.location.reload(); // Reload to process the recovery token
      return true;
    } catch (error) {
      console.error("[UpdatePassword] Error signing out:", error);
      return false;
    }
  };

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

    if (!hasValidSession) {
      setError("No valid session for password reset");
      toast({
        title: "Invalid session",
        description: "Please use a fresh password reset link from your email.",
        variant: "destructive",
      });
      return;
    }

    console.log("[UpdatePassword] Starting password update process");
    setIsLoading(true);

    // Set a timeout to clear the loading state in case the operation hangs
    const timeoutId = setTimeout(() => {
      console.warn("[UpdatePassword] Update password operation timed out after 45 seconds");
      setIsLoading(false);
      setError("The request timed out. Please try again or request a new reset link.");
      toast({
        title: "Request timed out",
        description: "The password update took too long. Please try again.",
        variant: "destructive",
      });
    }, 45000); // Increased to 45 seconds for more reliable operation

    try {
      // Update the user's password - Supabase will use the active session
      const { data, error } = await debugAuthOperation("updatePassword", () =>
        supabase.auth.updateUser({ password: password })
      );

      // Clear the timeout since the operation completed
      clearTimeout(timeoutId);

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

      // After password is updated successfully, clear the session to prevent session conflicts
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log("[UpdatePassword] Signed out after successful password update");
      } catch (signOutError) {
        console.error("[UpdatePassword] Error signing out after password update:", signOutError);
      }

      // Redirect to login page after successful password update
      // Added delay to ensure signout completes and toast is visible
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      console.error("[UpdatePassword] Error details:", error);
      // Clear the timeout if there's an error
      clearTimeout(timeoutId);
      
      toast({
        title: "Failed to update password",
        description: error.message || "There was a problem updating your password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Update Password</CardTitle>
          <CardDescription className="text-center">
            {hasValidSession ? 
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
          
          {!hasValidSession && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md">
              <p className="text-sm font-medium">
                No valid session found. You need to access this page using the complete link from your password reset email.
              </p>
              <p className="text-xs mt-1">
                The link may have expired or been used already. Make sure you're using the most recent email and clicking the complete link.
              </p>
              <Button
                variant="link"
                className="text-sm p-0 h-auto text-yellow-800 underline"
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
                disabled={isLoading || !hasValidSession}
                className={!hasValidSession ? "bg-gray-100" : ""}
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
                disabled={isLoading || !hasValidSession}
                className={!hasValidSession ? "bg-gray-100" : ""}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !hasValidSession}
            >
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
          
          {/* Debug info for development */}
          {process.env.NODE_ENV === 'development' && Object.keys(debugInfo).length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-xs font-medium text-gray-500 mb-1">Debug Info:</p>
              <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
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
