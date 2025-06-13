import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import AuthStateMonitor from '@/components/auth/AuthStateMonitor';

/**
 * Index component - Handles initial routing based on authentication state
 * Simplified to eliminate race conditions and improve stability
 */
const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole, isLoading, authInitialized, userId } = useUser();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showDelayMessage, setShowDelayMessage] = useState(false);
  
  // Single timeout for delay message
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (isLoading || !authInitialized) {
      timeoutId = setTimeout(() => {
        setShowDelayMessage(true);
      }, 5000);
    } else {
      setShowDelayMessage(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading, authInitialized]);

  // Simplified navigation logic
  useEffect(() => {
    // Only proceed when auth state is stable
    if (!authInitialized || isLoading) {
      return;
    }
    
    try {
      // User is not authenticated
      if (!userId) {
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
          navigate('/login', { replace: true });
      }
    } catch (error) {
      console.error('[Index] Navigation error:', error);
      setAuthError('An error occurred during navigation. Please refresh the page.');
    }
  }, [authInitialized, isLoading, userRole, userId, navigate, toast]);

  // Error state
  if (authError) {
    return (
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
    );
  }

  // Loading state
  return (
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
          {showDelayMessage && (
            <p className="text-amber-600 text-sm max-w-md px-4">
              This is taking longer than expected. Please wait...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
