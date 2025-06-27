import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import ErrorBoundary from '@/components/common/ErrorBoundary';

/**
 * Index component - Simplified entry point that handles routing based on auth state
 * Removed competing timeout mechanisms and simplified error handling
 */
const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole, isLoading, authInitialized, userId, authState, authError } = useAuth();
  
  // Enhanced navigation logic with better error handling
  useEffect(() => {
    // Only proceed when auth state is stable
    if (!authInitialized || isLoading) {
      return;
    }
    
    try {
      // Handle authentication errors
      if (authState === 'error' && authError) {
        console.error('[Index] Auth error detected:', authError);
        return;
      }
      
      // User is not authenticated
      if (!userId || authState === 'unauthenticated') {
        navigate('/login', { replace: true });
        return;
      }
      
      // Route based on user role
      switch (userRole) {
        case 'admin':
          navigate('/settings', { replace: true });
          break;
        case 'clinician':
          navigate('/calendar', { replace: true });
          break;
        case 'client':
          toast({
            title: "Clinician Portal",
            description: "This portal is for clinicians only. Please use the client portal.",
            variant: "destructive"
          });
          navigate('/login', { replace: true });
          break;
        default:
          // Handle unknown role
          console.warn(`[Index] Unknown user role: ${userRole}`);
          navigate('/login', { replace: true });
      }
    } catch (error) {
      console.error('[Index] Navigation error:', error);
    }
  }, [authInitialized, isLoading, userRole, userId, navigate, toast, authState, authError]);

  // Error state - handles auth errors
  if (authState === 'error' && authError) {
    return (
      <ErrorBoundary componentName="Index">
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center bg-red-50 p-6 rounded-lg border border-red-200 max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Authentication Error</h3>
            <p className="text-red-600 mb-4">{authError.message || "Unknown error"}</p>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Go to Login
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Loading state
  return (
    <ErrorBoundary componentName="Index">
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600 mb-2 font-medium">
              {!authInitialized
                ? "Initializing authentication..."
                : "Loading user data..."}
            </p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Index;
