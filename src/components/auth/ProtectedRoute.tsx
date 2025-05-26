
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles
}) => {
  const { userRole, isLoading, authInitialized } = useUser();
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  
  // Add timeout mechanism to prevent indefinite loading
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if ((isLoading || !authInitialized || isCheckingUser) && !loadingError) {
      console.log("[ProtectedRoute] Starting loading timeout check");
      timeoutId = setTimeout(() => {
        console.log("[ProtectedRoute] Loading timeout reached after 15 seconds");
        setLoadingTimeout(true);
        setLoadingError("Loading is taking longer than expected. Please refresh the page.");
        toast({
          title: "Loading Timeout",
          description: "Authentication is taking longer than expected. Please refresh the page.",
          variant: "destructive"
        });
      }, 15000); // 15 seconds timeout
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading, authInitialized, isCheckingUser, loadingError, toast]);

  // Log the current state for debugging
  console.log(`[ProtectedRoute] Status: isLoading=${isLoading}, authInitialized=${authInitialized}, userRole=${userRole}`);
  
  // Wait for UserContext to be fully initialized before making routing decisions
  // Handle loading states - distinguish between initial auth and data fetching
  if (isLoading || !authInitialized || isCheckingUser) {
    console.log("[ProtectedRoute] Waiting for initialization - authInitialized:", authInitialized, "isLoading:", isLoading, "isCheckingUser:", isCheckingUser);
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
        <p className="text-valorwell-600 mb-2">
          {!authInitialized
            ? "Initializing authentication..."
            : isLoading
              ? "Loading user data..."
              : "Verifying access..."}
        </p>
        {loadingTimeout && (
          <p className="text-amber-600 text-sm text-center max-w-md px-4">
            {loadingError || "This is taking longer than expected. Please wait or refresh the page."}
          </p>
        )}
      </div>
    );
  }
  
  // Handle error state
  if (loadingError) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <p className="text-red-600 font-medium mb-2">Authentication Error</p>
        <p className="text-center text-gray-600 mb-6 max-w-md px-4">{loadingError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-valorwell-600 text-white rounded-md"
        >
          Refresh Page
        </button>
      </div>
    );
  }
  
  // First check role-based access
  if (!userRole || !allowedRoles.includes(userRole)) {
    console.log(`[ProtectedRoute] User role '${userRole}' not in allowed roles: [${allowedRoles.join(', ')}]`);
    
    // Check if this is a client trying to access clinician functionality
    if (userRole === 'client') {
      console.log("[ProtectedRoute] Client attempting to access clinician portal");
      toast({
        title: "Access Denied",
        description: "This portal is only for clinicians. Please use the client portal.",
        variant: "destructive"
      });
      return <Navigate to="/login" replace />;
    }
    
    // Admin can access all routes
    if (userRole === 'admin') {
      console.log("[ProtectedRoute] Admin override - allowing access");
      return <>{children}</>;
    }
    // Redirect clinicians to Calendar page
    else if (userRole === 'clinician') {
      console.log("[ProtectedRoute] Redirecting clinician to Calendar");
      return <Navigate to="/calendar" replace />;
    }
    // Redirect everyone else to login
    else {
      console.log("[ProtectedRoute] No valid role, redirecting to login");
      return <Navigate to="/login" replace />;
    }
  }
  
  // Allow access to the protected route
  console.log(`[ProtectedRoute] Access granted to protected route with role: ${userRole}`);
  return <>{children}</>;
};

export default ProtectedRoute;
