import { useEffect } from 'react';
import { useUser } from '@/context/UserContext';
interface AuthStateMonitorProps {
  visible?: boolean;
}

/**
 * A component that monitors and logs authentication state changes
 * This is useful for debugging authentication issues
 */
const AuthStateMonitor = ({
  visible = false
}: AuthStateMonitorProps) => {
  const {
    user,
    userId,
    userRole,
    isLoading,
    authInitialized,
    clientStatus
  } = useUser();

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
  return;
};
export default AuthStateMonitor;