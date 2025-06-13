
import { ReactNode, useEffect, useState, useMemo } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import AuthStateMonitor from '@/components/auth/AuthStateMonitor';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoading: userContextLoading, userId, authInitialized, authState, authError } = useUser();
  const [loadingTimeout, setLoadingTimeout] = useState<'initial' | 'extended' | 'critical'>('initial');

  // Memoize loading state to prevent unnecessary re-renders
  const isLoadingState = useMemo(() => {
    return userContextLoading || !authInitialized;
  }, [userContextLoading, authInitialized]);

  // CRITICAL FIX: Only redirect when auth is fully initialized and stable
  useEffect(() => {
    if (authInitialized && !userContextLoading) {
      if (!userId) {
        navigate('/login');
      }
    }
  }, [navigate, userId, authInitialized, userContextLoading]);

  // Enhanced timeout mechanism with multiple stages
  useEffect(() => {
    let initialTimeoutId: NodeJS.Timeout;
    let extendedTimeoutId: NodeJS.Timeout;
    let criticalTimeoutId: NodeJS.Timeout;
    
    if (isLoadingState) {
      // First timeout - normal delay (5 seconds)
      initialTimeoutId = setTimeout(() => {
        setLoadingTimeout('extended');
      }, 5000);
      
      // Second timeout - extended delay (15 seconds)
      extendedTimeoutId = setTimeout(() => {
        setLoadingTimeout('critical');
        
        // Show toast notification for extended loading
        toast({
          title: "Loading Delay",
          description: "Authentication is taking longer than expected. You can continue waiting or refresh the page.",
          variant: "destructive",
          duration: 10000
        });
      }, 15000);
      
      // Final timeout - critical delay (30 seconds)
      criticalTimeoutId = setTimeout(() => {
        // Force auth initialization to prevent permanent loading state
        if (isLoadingState) {
          console.error("[Layout] Critical timeout reached - forcing navigation to login");
          navigate('/login', { replace: true });
        }
      }, 30000);
    } else {
      setLoadingTimeout('initial');
    }
    
    return () => {
      clearTimeout(initialTimeoutId);
      clearTimeout(extendedTimeoutId);
      clearTimeout(criticalTimeoutId);
    };
  }, [isLoadingState, toast, navigate]);

  // Handle auth errors with fallback UI
  if (authState === 'error' && authError) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center max-w-md">
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-red-800">Authentication Error</h2>
            <p className="text-red-600 max-w-md">
              {authError.message || "There was a problem connecting to the authentication service."}
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/login')}
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
  }

  // Enhanced loading component with progressive messaging
  const loadingComponent = useMemo(() => {
    let message = "Loading user data...";
    let additionalMessage = null;
    
    if (loadingTimeout === 'extended') {
      message = "Taking longer than expected...";
      additionalMessage = "Please wait while we connect to the server.";
    } else if (loadingTimeout === 'critical') {
      message = "Connection issues detected";
      additionalMessage = "We're having trouble connecting to the authentication service. You can wait or refresh the page.";
    }
    
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
        <p className="text-valorwell-600 font-medium mb-2">
          {message}
        </p>
        {additionalMessage && (
          <p className="text-gray-500 text-sm max-w-md text-center px-4">
            {additionalMessage}
          </p>
        )}
        {loadingTimeout === 'critical' && (
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        )}
      </div>
    );
  }, [loadingTimeout]);

  // Show loading state while checking auth
  if (isLoadingState) {
    return loadingComponent;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Add AuthStateMonitor for development environment */}
      {process.env.NODE_ENV === 'development' && <AuthStateMonitor visible={true} />}
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
