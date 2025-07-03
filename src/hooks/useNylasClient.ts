
import { useMemo } from 'react';
import { useAuth } from './useAuth';

// Browser-compatible Nylas client - disable for now due to Node.js dependencies
export function useNylasClient() {
  const { isAuthenticated } = useAuth();
  
  return useMemo(() => {
    // Temporarily disable Nylas client due to browser compatibility issues
    // The Node.js SDK is not compatible with browser environments
    console.warn('[useNylasClient] Nylas SDK disabled due to browser compatibility issues');
    return null;
  }, [isAuthenticated]);
}
