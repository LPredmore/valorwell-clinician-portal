/**
 * Authentication Debugging Utilities
 * 
 * This file contains utilities for debugging authentication issues in the Valorwell Clinician Portal.
 * These utilities help identify and resolve authentication initialization deadlocks and race conditions.
 */

import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Enable/disable debug logging based on environment
const isDev = process.env.NODE_ENV === 'development';
const logInfo = isDev ? console.log : () => {};
const logWarn = isDev ? console.warn : () => {};
const logError = console.error;

/**
 * Authentication state types for debugging
 */
export type AuthDebugState = 
  | 'initializing'
  | 'checking_session'
  | 'session_retrieved'
  | 'fetching_user_data'
  | 'user_data_retrieved'
  | 'authentication_complete'
  | 'authentication_error'
  | 'authentication_timeout';

/**
 * Tracks the current authentication state for debugging
 */
let currentAuthState: AuthDebugState = 'initializing';
let authStateTimestamps: Record<AuthDebugState, number | null> = {
  initializing: null,
  checking_session: null,
  session_retrieved: null,
  fetching_user_data: null,
  user_data_retrieved: null,
  authentication_complete: null,
  authentication_error: null,
  authentication_timeout: null
};

/**
 * Updates the authentication state and logs the transition
 */
export function updateAuthDebugState(newState: AuthDebugState): void {
  const prevState = currentAuthState;
  currentAuthState = newState;
  authStateTimestamps[newState] = Date.now();
  
  logInfo(`[AuthDebug] State transition: ${prevState} -> ${newState}`);
  
  // Calculate time since initialization
  const initTime = authStateTimestamps.initializing;
  if (initTime) {
    const elapsed = Math.round((Date.now() - initTime) / 10) / 100;
    logInfo(`[AuthDebug] Elapsed time: ${elapsed}s`);
  }
}

/**
 * Gets the current authentication debug state
 */
export function getAuthDebugState(): AuthDebugState {
  return currentAuthState;
}

/**
 * Gets the authentication state history with timestamps
 */
export function getAuthStateHistory(): Record<AuthDebugState, number | null> {
  return { ...authStateTimestamps };
}

/**
 * Checks if authentication is taking too long and logs warnings
 */
export function checkAuthTimeout(timeoutMs: number = 5000): boolean {
  const initTime = authStateTimestamps.initializing;
  if (!initTime) return false;
  
  const elapsed = Date.now() - initTime;
  if (elapsed > timeoutMs) {
    logWarn(`[AuthDebug] Authentication taking too long: ${elapsed}ms`);
    return true;
  }
  
  return false;
}

/**
 * Performs a direct session check bypassing the normal auth flow
 * Useful for diagnosing auth initialization issues
 */
export async function performEmergencySessionCheck(): Promise<{
  user: SupabaseUser | null;
  error: Error | null;
}> {
  try {
    logWarn('[AuthDebug] Performing emergency session check');
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
 * Resets the authentication state machine for a fresh start
 * Useful when auth gets into a bad state
 */
export function resetAuthStateMachine(): void {
  logWarn('[AuthDebug] Resetting auth state machine');
  
  // Reset state
  currentAuthState = 'initializing';
  
  // Reset timestamps
  Object.keys(authStateTimestamps).forEach(key => {
    authStateTimestamps[key as AuthDebugState] = null;
  });
  
  // Set initialization timestamp
  authStateTimestamps.initializing = Date.now();
}

/**
 * Logs the complete authentication state for debugging
 */
export function logAuthDebugInfo(userContext: any): void {
  logInfo('=== AUTH DEBUG INFO ===');
  logInfo('Current Auth Debug State:', currentAuthState);
  logInfo('Auth State Timestamps:', authStateTimestamps);
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

// Initialize timestamps on module load
authStateTimestamps.initializing = Date.now();

export default {
  updateAuthDebugState,
  getAuthDebugState,
  getAuthStateHistory,
  checkAuthTimeout,
  performEmergencySessionCheck,
  resetAuthStateMachine,
  logAuthDebugInfo
};
