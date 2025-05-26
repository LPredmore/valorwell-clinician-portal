
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import AuthStateMonitor from '@/components/auth/AuthStateMonitor';

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole, isLoading, authInitialized, userId } = useUser();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [forceRedirectTimer, setForceRedirectTimer] = useState(0);
  
  // Add timeout mechanism to prevent indefinite loading
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if ((isLoading || !authInitialized) && !authError) {
      console.log("[Index] Starting loading timeout check");
      timeoutId = setTimeout(() => {
        console.log("[Index] Loading timeout reached after 10 seconds");
        setLoadingTimeout(true);
        toast({
          title: "Loading Delay",
          description: "Authentication is taking longer than expected. Please wait or refresh the page.",
          variant: "default"
        });
      }, 10000); // 10 seconds timeout
      
      // Add a second timeout for critical failure
      const criticalTimeoutId = setTimeout(() => {
        console.log("[Index] Critical loading timeout reached after 30 seconds");
        setAuthError("Authentication process is taking too long. Please refresh the page or try again later.");
        toast({
          title: "Authentication Error",
          description: "Failed to complete authentication. Please refresh the page.",
          variant: "destructive"
        });
      }, 30000); // 30 seconds for critical timeout
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(criticalTimeoutId);
      };
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading, authInitialized, authError, toast]);

  // Reduced force redirect timer from 15 to 10 seconds for faster experience
  useEffect(() => {
    let forcedRedirectTimer: NodeJS.Timeout;
    
    // If we have a userId but auth isn't fully initialized, start a timer
    if (userId && (!authInitialized || isLoading)) {
      console.log("[Index] Starting forced redirect timer - we have userId but auth isn't fully initialized");
      let secondsLeft = 10; // Reduced from 15 to 10 seconds
      
      const intervalTimer = setInterval(() => {
        secondsLeft--;
        setForceRedirectTimer(secondsLeft);
        
        if (secondsLeft <= 0) {
          clearInterval(intervalTimer);
        }
      }, 1000);
      
      forcedRedirectTimer = setTimeout(() => {
        console.log("[Index] Forcing redirect despite auth not being fully initialized");
        // Add more detailed logging for debugging
        console.log(`[Index] Force redirect with userRole: ${userRole}, userId: ${userId}`);
        
        // Handle redirection based on known information
        if (userRole === 'admin') {
          navigate('/settings');
        } else if (userRole === 'clinician') {
          navigate('/clinician-dashboard');
        } else if (userRole === 'client') {
          // Inform client users they are on the wrong portal
          toast({
            title: "Client Portal Access",
            description: "This is the clinician portal. Please use the client portal.",
            variant: "destructive"
          });
          navigate('/login');
        } else {
          navigate('/login');
        }
      }, 10000); // 10 seconds (reduced from 15)
      
      return () => {
        clearTimeout(forcedRedirectTimer);
        clearInterval(intervalTimer);
      };
    }
    
    return () => {};
  }, [userId, authInitialized, isLoading, userRole, navigate, toast]);

  useEffect(() => {
    console.log("[Index] Checking redirect conditions - userId:", userId, "authInitialized:", authInitialized, "isLoading:", isLoading);
    console.log("[Index] Index page mounted, isLoading:", isLoading, "userRole:", userRole, "authInitialized:", authInitialized);
    
    // Only make redirect decisions if the UserContext is fully initialized
    if (authInitialized && !isLoading && userId) {
      console.log("[Index] Conditions met for role-based navigation");
      console.log("[Index] User context fully initialized, determining redirect");
      
      // Track whether we've redirected to prevent multiple redirects
      let redirected = false;
      
      if (userRole === 'admin') {
        console.log("[Index] Redirecting admin to Settings page");
        navigate('/settings');
        redirected = true;
      } else if (userRole === 'clinician') {
        console.log("[Index] Redirecting clinician to Dashboard page");
        navigate('/clinician-dashboard');
        redirected = true;
      } else if (userRole === 'client') {
        console.log("[Index] Client on clinician portal - redirecting to login with message");
        toast({
          title: "Clinician Portal",
          description: "This portal is for clinicians only. Please use the client portal.",
          variant: "destructive"
        });
        navigate('/login');
        redirected = true;
      }
      
      // Only redirect to login if not loading, auth is initialized AND no valid role was found
      if (!redirected && !userRole) {
        console.log("[Index] No valid role found, redirecting to Login page");
        navigate('/login');
      }
    } else if (authInitialized && !isLoading && !userId) {
      // If auth is initialized, not loading, and no user ID - go to login
      console.log("[Index] Auth initialized but no user, redirecting to login");
      navigate('/login');
    } else {
      console.log("[Index] Waiting for user context to fully initialize before redirecting");
    }
  }, [navigate, userRole, isLoading, authInitialized, userId, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      {/* Set AuthStateMonitor to be visible in development environment for debugging */}
      <AuthStateMonitor visible={process.env.NODE_ENV === 'development'} />
      <div className="text-center">
        {isLoading || !authInitialized ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600 mb-2">
              {!authInitialized
                ? "Initializing authentication..."
                : "Loading user data..."}
            </p>
            {loadingTimeout && !authError && (
              <p className="text-amber-600 text-sm max-w-md px-4">
                This is taking longer than expected. Please wait...
              </p>
            )}
            
            {/* Show forced redirect countdown if applicable */}
            {userId && forceRedirectTimer > 0 && (
              <p className="text-blue-600 text-sm max-w-md px-4 mt-2">
                Redirecting in {forceRedirectTimer} seconds...
              </p>
            )}
          </div>
        ) : null}
        
        {authError && (
          <div className="flex flex-col items-center bg-red-50 p-6 rounded-lg border border-red-200 max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Authentication Error</h3>
            <p className="text-red-600 mb-4">{authError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
