
import { ReactNode, useEffect, useState } from 'react';
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

  // Effect to handle redirects based on authentication status
  useEffect(() => {
    console.log("[Layout] Initializing layout, userContextLoading:", userContextLoading, "authInitialized:", authInitialized);
    
    // Redirect to login immediately if we know there's no user and auth is initialized
    if (authInitialized && !userId) {
      console.log("[Layout] No authenticated user found, redirecting to login");
      navigate('/login');
    }
  }, [navigate, userContextLoading, userId, authInitialized]);

  // Add timeout mechanism to prevent indefinite loading
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (userContextLoading && !authInitialized) {
      console.log("[Layout] Starting loading timeout check");
      timeoutId = setTimeout(() => {
        console.log("[Layout] Loading timeout reached after 5 seconds");
        setLoadingTimeout(true);
      }, 5000); // Reduced from 10 to 5 seconds
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [userContextLoading, authInitialized]);

  // Show loading state while checking auth - updated to consider both states
  if (userContextLoading && !authInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
        <p className="text-valorwell-600">
          {loadingTimeout ? "Taking longer than expected..." : "Loading user data..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Add AuthStateMonitor for development environment */}
      {import.meta.env.MODE === 'development' && <AuthStateMonitor visible={true} />}
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
