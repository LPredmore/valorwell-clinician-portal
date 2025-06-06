
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import AuthStateMonitor from '@/components/auth/AuthStateMonitor';

const Index = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { userRole, isLoading, authInitialized, userId } = useUser();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Memoize loading state with stable dependencies
  const isCurrentlyLoading = useMemo(() => {
    return (isLoading || !authInitialized) && !authError;
  }, [isLoading, authInitialized, authError]);
  
  // Memoize navigation logic with stable dependencies
  const navigationLogic = useCallback((role: string | null, hasUserId: boolean) => {
    if (!hasUserId) {
      return '/login';
    }
    
    switch (role) {
      case 'admin':
        return '/settings';
      case 'clinician':
        return '/calendar';
      case 'client':
        toast({
          title: "Clinician Portal",
          description: "This portal is for clinicians only. Please use the client portal.",
          variant: "destructive"
        });
        return '/login';
      default:
        return '/login';
    }
  }, [toast]);
  
  // Optimized timeout mechanism
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let criticalTimeoutId: NodeJS.Timeout;
    
    if (isCurrentlyLoading) {
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
        toast({
          title: "Loading Delay",
          description: "Authentication is taking longer than expected. Please wait or refresh the page.",
          variant: "default"
        });
      }, 10000);
      
      criticalTimeoutId = setTimeout(() => {
        setAuthError("Authentication process is taking too long. Please refresh the page or try again later.");
        toast({
          title: "Authentication Error",
          description: "Failed to complete authentication. Please refresh the page.",
          variant: "destructive"
        });
      }, 30000);
    } else {
      setLoadingTimeout(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (criticalTimeoutId) clearTimeout(criticalTimeoutId);
    };
  }, [isCurrentlyLoading, toast]);

  // Handle navigation when auth is ready with location awareness
  useEffect(() => {
    if (authInitialized && !isLoading && !authError) {
      const destination = navigationLogic(userRole, !!userId);
      if (destination && location.pathname !== destination) {
        navigate(destination);
      }
    }
  }, [authInitialized, isLoading, userRole, userId, navigate, navigationLogic, authError, location.pathname]);

  // Memoized components to prevent unnecessary re-renders
  const errorComponent = useMemo(() => (
    <div className="min-h-screen flex items-center justify-center">
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
    </div>
  ), [authError]);

  const loadingComponent = useMemo(() => (
    <div className="min-h-screen flex items-center justify-center">
      {process.env.NODE_ENV === 'development' && <AuthStateMonitor visible={true} />}
      <div className="text-center">
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
        </div>
      </div>
    </div>
  ), [authInitialized, loadingTimeout, authError]);

  if (authError) {
    return errorComponent;
  }

  if (isCurrentlyLoading) {
    return loadingComponent;
  }

  return loadingComponent;
});

Index.displayName = 'Index';

export default Index;
