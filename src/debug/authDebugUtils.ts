
/**
 * Simplified Authentication Debugging Utilities
 * 
 * This file contains utilities for debugging authentication issues in the Valorwell Clinician Portal.
 * Simplified to remove the separate state machine and use AuthProvider as the single source of truth.
 */

// Enable/disable debug logging based on environment
const isDev = process.env.NODE_ENV === 'development';
const logInfo = isDev ? console.log : () => {};
const logWarn = isDev ? console.warn : () => {};
const logError = console.error;

/**
 * Debug wrapper for authentication operations
 */
export async function debugAuthOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  try {
    logInfo(`[AuthDebug] Starting operation: ${operationName}`);
    const result = await operation();
    logInfo(`[AuthDebug] Operation completed: ${operationName}`);
    return result;
  } catch (error) {
    logError(`[AuthDebug] Operation failed: ${operationName}`, error);
    throw error;
  }
}

/**
 * Logs the complete authentication state for debugging
 */
export function logAuthDebugInfo(userContext: any): void {
  if (!isDev) return;
  
  logInfo('=== AUTH DEBUG INFO ===');
  logInfo('UserContext State:', {
    isLoading: userContext.isLoading,
    authInitialized: userContext.authInitialized,
    authState: userContext.authState,
    userId: userContext.userId,
    userRole: userContext.userRole,
    hasAuthError: !!userContext.authError
  });
  logInfo('========================');
}

/**
 * Performs a direct session check for diagnostic purposes
 */
export async function performEmergencySessionCheck(): Promise<{
  user: any | null;
  error: Error | null;
}> {
  try {
    logWarn('[AuthDebug] Performing emergency session check');
    
    // Import supabase dynamically to avoid circular dependencies
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      logError('[AuthDebug] Emergency session check failed:', error);
      return { user: null, error: error as Error };
    }
    
    const user = data.session?.user || null;
    logInfo('[AuthDebug] Emergency session check result:', user ? 'User found' : 'No active session');
    
    return { user, error: null };
  } catch (error) {
    logError('[AuthDebug] Exception in emergency session check:', error);
    return { user: null, error: error as Error };
  }
}

/**
 * Checks if authentication is taking too long and logs warnings
 */
export function checkAuthTimeout(timeoutMs: number = 5000): boolean {
  // This is a simplified version that just logs a warning
  // The actual timeout handling is now in AuthProvider
  logWarn(`[AuthDebug] Authentication timeout check requested (${timeoutMs}ms)`);
  return false;
}

export default {
  debugAuthOperation,
  logAuthDebugInfo,
  performEmergencySessionCheck,
  checkAuthTimeout
};
