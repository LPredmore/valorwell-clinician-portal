
import { ReactNode, useEffect, useState, useMemo, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import AuthStateMonitor from '@/components/auth/AuthStateMonitor';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoading: userContextLoading, userId, authInitialized } = useUser();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Memoize loading state to prevent unnecessary re-renders
  const isLoadingState = useMemo(() => {
    return userContextLoading && !authInitialized;
  }, [userContextLoading, authInitialized]);

  // Effect to handle redirects based on authentication status with proper dependencies
  useEffect(() => {
    if (authInitialized) {
      if (!userId) {
        navigate('/login');
      }
    }
  }, [navigate, userId, authInitialized]);

  // Add timeout mechanism to prevent indefinite loading with optimized dependencies
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isLoadingState) {
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 seconds timeout
    } else {
      setLoadingTimeout(false);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoadingState]);

  // Memoize loading component to prevent re-renders
  const loadingComponent = useMemo(() => (
    <div className="flex h-screen w-full items-center justify-center flex-col">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
      <p className="text-valorwell-600">
        {loadingTimeout ? "Taking longer than expected..." : "Loading user data..."}
      </p>
    </div>
  ), [loadingTimeout]);

  // Show loading state while checking auth - updated to consider both states
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
