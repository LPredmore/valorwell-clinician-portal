import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import AuthStateMonitor from '@/components/auth/AuthStateMonitor';
import ErrorBoundary from '@/components/common/ErrorBoundary';

/**
 * Index component - Handles initial routing based on authentication state
 * Simplified to eliminate race conditions and improve stability
 */
/**
 * Enhanced Index component with improved error handling and state management
 * Acts as the main entry point for the application
 */
const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole, isLoading, authInitialized, userId, authState, authError } = useUser();
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<'initial' | 'delayed' | 'critical'>('initial');
  
  // Enhanced timeout system with multiple stages
  useEffect(() => {
    let delayTimeoutId: NodeJS.Timeout | null = null;
    let criticalTimeoutId: NodeJS.Timeout | null = null;
    
    if (isLoading || !authInitialized) {
      // First stage timeout - show delay message
      delayTimeoutId = setTimeout(() => {
        setLoadingState('delayed');
      }, 5000);
      
      // Second stage timeout - critical delay
      criticalTimeoutId = setTimeout(() => {
        setLoadingState('critical');
        console.warn('[Index] Critical loading timeout reached');
      }, 15000);
    } else {
      setLoadingState('initial');
    }
    
    return () => {
      if (delayTimeoutId) clearTimeout(delayTimeoutId);
      if (criticalTimeoutId) clearTimeout(criticalTimeoutId);
    };
  }, [isLoading, authInitialized]);

  // Handle manual navigation to login
  const goToLogin = useCallback(() => {
    navigate('/login', { replace: true });
  }, [navigate]);
  
  // Handle page refresh
  const refreshPage = useCallback(() => {
    window.location.reload();
  }, []);

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
        setNavigationError(`Authentication error: ${authError.message || 'Unknown error'}`);
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
      setNavigationError('An error occurred during navigation. Please refresh the page.');
    }
  }, [authInitialized, isLoading, userRole, userId, navigate, toast, authState, authError]);

  // Error state - handles both auth errors and navigation errors
  if (navigationError || (authState === 'error' && authError)) {
    const errorMessage = navigationError || (authError ? authError.message : 'Unknown error');
    
    return (
      <ErrorBoundary componentName="Index">
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center bg-red-50 p-6 rounded-lg border border-red-200 max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Authentication Error</h3>
            <p className="text-red-600 mb-4">{errorMessage}</p>
            <div className="flex space-x-4">
              <button
                onClick={goToLogin}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Go to Login
              </button>
              <button
                onClick={refreshPage}
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

  // Enhanced loading state with progressive messaging
  return (
    <ErrorBoundary componentName="Index">
      <div className="min-h-screen flex items-center justify-center">
        {process.env.NODE_ENV === 'development' && <AuthStateMonitor visible={true} />}
        <div className="text-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600 mb-2 font-medium">
              {!authInitialized
                ? "Initializing authentication..."
                : "Loading user data..."}
            </p>
            
            {loadingState === 'delayed' && (
              <p className="text-amber-600 text-sm max-w-md px-4">
                This is taking longer than expected. Please wait...
              </p>
            )}
            
            {loadingState === 'critical' && (
              <div className="mt-4 flex flex-col items-center">
                <p className="text-red-600 text-sm max-w-md px-4 mb-4">
                  We're having trouble connecting to the authentication service.
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={goToLogin}
                    className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Go to Login
                  </button>
                  <button
                    onClick={refreshPage}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Page
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Index;
