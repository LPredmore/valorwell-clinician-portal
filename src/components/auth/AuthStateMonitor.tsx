
import { useEffect } from 'react';
import { useUser } from '@/context/UserContext';

interface AuthStateMonitorProps {
  visible?: boolean;
}

/**
 * A component that monitors and logs authentication state changes
 * This is useful for debugging authentication issues
 */
const AuthStateMonitor = ({ visible = false }: AuthStateMonitorProps) => {
  const { user, userId, userRole, isLoading, authInitialized, clientStatus } = useUser();
  
  // Log auth state changes
  useEffect(() => {
    console.group('[AuthStateMonitor] Auth State Update');
    console.log('authInitialized:', authInitialized);
    console.log('isLoading:', isLoading);
    console.log('userId:', userId);
    console.log('userRole:', userRole);
    console.log('clientStatus:', clientStatus);
    console.log('user:', user);
    console.groupEnd();
    
    // Log specific events related to the authInitialized flag
    if (authInitialized) {
      console.log('[AuthStateMonitor] ✅ authInitialized flag is TRUE');
    } else {
      console.log('[AuthStateMonitor] ❌ authInitialized flag is FALSE');
    }
    
    // Log when auth is fully initialized and not loading
    if (authInitialized && !isLoading) {
      console.log('[AuthStateMonitor] 🚀 Authentication fully initialized and not loading');
      
      // Log full authentication state for debugging
      if (userId) {
        console.log(`[AuthStateMonitor] 👤 Authenticated user: ${userId} with role: ${userRole}`);
      } else {
        console.log('[AuthStateMonitor] 🔒 No authenticated user');
      }
    }
  }, [authInitialized, isLoading, userId, userRole, clientStatus, user]);
  
  // Only render visual component if visible is true
  if (!visible) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-md text-xs z-50 max-w-xs">
      <div className="font-bold mb-1">Auth State Monitor</div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        <div>authInitialized:</div>
        <div className={authInitialized ? "text-green-400" : "text-red-400"}>
          {authInitialized ? "true ✓" : "false ✗"}
        </div>
        
        <div>isLoading:</div>
        <div className={!isLoading ? "text-green-400" : "text-yellow-400"}>
          {isLoading ? "true ⟳" : "false ✓"}
        </div>
        
        <div>userId:</div>
        <div className={userId ? "text-green-400" : "text-gray-400"}>
          {userId ? userId.substring(0, 8) + "..." : "null"}
        </div>
        
        <div>userRole:</div>
        <div className={userRole ? "text-green-400" : "text-gray-400"}>
          {userRole || "null"}
        </div>
        
        <div>clientStatus:</div>
        <div className={clientStatus ? "text-green-400" : "text-gray-400"}>
          {clientStatus || "null"}
        </div>
      </div>
    </div>
  );
};

export default AuthStateMonitor;
