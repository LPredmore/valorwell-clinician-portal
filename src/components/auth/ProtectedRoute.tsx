
import React, { useMemo, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = React.memo(({
  children,
  allowedRoles
}) => {
  const { userRole, isLoading, authInitialized, authState, authError } = useUser();
  const { toast } = useToast();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [criticalTimeout, setCriticalTimeout] = useState(false);
  
  // Enhanced timeout handling for loading state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let criticalTimeoutId: NodeJS.Timeout | null = null;
    
    if (!authInitialized || isLoading) {
      // Set a timeout to show extended loading message
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000);
      
      // Set a critical timeout to prevent infinite loading
      criticalTimeoutId = setTimeout(() => {
        setCriticalTimeout(true);
        console.error('[ProtectedRoute] Critical timeout reached - auth initialization failed');
      }, 15000);
    } else {
      setLoadingTimeout(false);
      setCriticalTimeout(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (criticalTimeoutId) clearTimeout(criticalTimeoutId);
    };
  }, [authInitialized, isLoading]);
  
  // Memoize the access decision to prevent unnecessary recalculations
  const accessDecision = useMemo(() => {
    // Force a decision after critical timeout to prevent deadlock
    if (criticalTimeout) {
      console.warn('[ProtectedRoute] Forcing login redirect due to critical timeout');
      return { type: 'login_redirect' };
    }
    
    // Handle auth errors explicitly
    if (authState === 'error' && authError) {
      console.error('[ProtectedRoute] Auth error:', authError.message);
      return { type: 'error', message: authError.message };
    }
    
    // Only make decisions when auth is fully initialized
    if (!authInitialized || isLoading) {
      return { type: 'loading' };
    }
    
    // Admin can access all routes
    if (userRole === 'admin') {
      return { type: 'allow' };
    }
    
    // Check role-based access
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Check if this is a client trying to access clinician functionality
      if (userRole === 'client') {
        return { type: 'client_redirect' };
      }
      // Redirect clinicians to Calendar page
      else if (userRole === 'clinician') {
        return { type: 'clinician_redirect' };
      }
      // Redirect everyone else to login
      else {
        return { type: 'login_redirect' };
      }
    }
    
    return { type: 'allow' };
  }, [authInitialized, isLoading, userRole, allowedRoles, authState, authError, criticalTimeout]);
  
  // Handle different access decisions
  switch (accessDecision.type) {
    case 'loading':
      return (
        <div className="flex h-screen w-full items-center justify-center flex-col">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
          <p className="text-valorwell-600 mb-2">
            {!authInitialized
              ? "Initializing authentication..."
              : "Loading user data..."}
          </p>
          {loadingTimeout && (
            <p className="text-amber-600 text-sm max-w-md px-4 text-center">
              This is taking longer than expected. Please wait or try refreshing the page.
            </p>
          )}
          {criticalTimeout && (
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      );
    
    case 'error':
      return (
        <div className="flex h-screen w-full items-center justify-center flex-col">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center max-w-md">
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <h2 className="text-xl font-semibold text-red-800">Authentication Error</h2>
              <p className="text-red-600 max-w-md">
                {accessDecision.message || "There was a problem with authentication. Please try again."}
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => window.location.href = '/login'}
                  className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Go to Login
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
      
    case 'client_redirect':
      toast({
        title: "Access Denied",
        description: "This portal is only for clinicians. Please use the client portal.",
        variant: "destructive"
      });
      return <Navigate to="/login" replace />;
      
    case 'clinician_redirect':
      return <Navigate to="/calendar" replace />;
      
    case 'login_redirect':
      return <Navigate to="/login" replace />;
      
    case 'allow':
    default:
      return <>{children}</>;
  }
});

ProtectedRoute.displayName = 'ProtectedRoute';

export default ProtectedRoute;
