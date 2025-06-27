
import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = React.memo(({ 
  children, 
  allowedRoles
}) => {
  const { userRole, isLoading, authInitialized } = useUser();
  const { toast } = useToast();
  const location = useLocation();
  
  // Memoize the access decision to prevent unnecessary recalculations
  const accessDecision = useMemo(() => {
    // CRITICAL FIX: Only make decisions when auth is fully initialized
    if (!authInitialized || isLoading) {
      return { type: 'loading' };
    }
    
    // FIXED: Admin can access all routes - check this FIRST
    if (userRole === 'admin') {
      console.log('[ProtectedRoute] Admin access granted for route:', location.pathname);
      return { type: 'allow' };
    }
    
    // Check role-based access for non-admins
    if (!userRole || !allowedRoles.includes(userRole)) {
      console.log('[ProtectedRoute] Access denied:', { userRole, allowedRoles, route: location.pathname });
      
      // Check if this is a client trying to access clinician functionality
      if (userRole === 'client') {
        return { type: 'client_redirect' };
      }
      // Redirect clinicians to Calendar page if they don't have access
      else if (userRole === 'clinician') {
        return { type: 'clinician_redirect' };
      }
      // Redirect everyone else to login
      else {
        return { type: 'login_redirect' };
      }
    }
    
    console.log('[ProtectedRoute] Role-based access granted:', { userRole, allowedRoles, route: location.pathname });
    return { type: 'allow' };
  }, [authInitialized, isLoading, userRole, allowedRoles, location.pathname]);
  
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
