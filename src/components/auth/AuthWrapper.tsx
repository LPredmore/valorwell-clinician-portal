import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { AlertCircle, RefreshCw } from 'lucide-react';
import ErrorBoundary from '@/components/common/ErrorBoundary';

interface AuthWrapperProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallbackPath?: string;
}

/**
 * AuthWrapper - A simplified component that handles authentication state and role-based access
 * Replaces the previous ProtectedRoute component and removes circular dependencies
 */
const AuthWrapper: React.FC<AuthWrapperProps> = ({
  children,
  allowedRoles = [],
  fallbackPath = '/login'
}) => {
  const { userId, userRole, isLoading, authInitialized, authState, authError } = useAuth();
  const location = useLocation();

  // Show loading state while auth is initializing
  if (!authInitialized || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center flex-col min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
        <p className="text-valorwell-600 font-medium">
          {!authInitialized ? "Initializing authentication..." : "Loading user data..."}
        </p>
      </div>
    );
  }

  // Handle auth errors
  if (authState === 'error' && authError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <div className="flex flex-col items-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-xl font-semibold text-red-800">Authentication Error</h2>
          <p className="text-red-600 max-w-md">
            {authError.message || "There was a problem with authentication. Please try again."}
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
    );
  }

  // Check if user is authenticated
  if (!userId || authState === 'unauthenticated') {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role-based access if roles are specified
  if (allowedRoles.length > 0) {
    // Admin can access all routes
    if (userRole === 'admin') {
      return <ErrorBoundary>{children}</ErrorBoundary>;
    }

    // Check if user has required role
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Redirect clients to client portal
      if (userRole === 'client') {
        return <Navigate to="/portal" replace />;
      }
      // Redirect clinicians to calendar
      else if (userRole === 'clinician') {
        return <Navigate to="/calendar" replace />;
      }
      // Redirect others to login
      else {
        return <Navigate to={fallbackPath} replace />;
      }
    }
  }

  // User is authenticated and has required role (or no roles specified)
  return <ErrorBoundary>{children}</ErrorBoundary>;
};

export default AuthWrapper;