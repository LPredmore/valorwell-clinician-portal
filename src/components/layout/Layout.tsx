
import { ReactNode, useEffect, useState, useMemo, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import AuthStateMonitor from '@/components/auth/AuthStateMonitor';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isLoading: userContextLoading, userId, authInitialized } = useUser();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Memoize loading state with stable dependencies
  const isLoadingState = useMemo(() => {
    return userContextLoading && !authInitialized;
  }, [userContextLoading, authInitialized]);

  // Effect to handle redirects with location-aware logic
  useEffect(() => {
    if (authInitialized && !isLoadingState) {
      if (!userId) {
        // Only redirect to login if not already there
        if (location.pathname !== '/login') {
          navigate('/login');
        }
      }
    }
  }, [navigate, userId, authInitialized, isLoadingState, location.pathname]);

  // Optimized timeout mechanism
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isLoadingState) {
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000);
    } else {
      setLoadingTimeout(false);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoadingState]);

  // Memoize loading component with stable dependencies
  const loadingComponent = useMemo(() => (
    <div className="flex h-screen w-full items-center justify-center flex-col">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
      <p className="text-valorwell-600">
        {loadingTimeout ? "Taking longer than expected..." : "Loading user data..."}
      </p>
    </div>
  ), [loadingTimeout]);

  // Show loading state only when actually loading
  if (isLoadingState) {
    return loadingComponent;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
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
