
import { DebugUtils } from '../utils/debugUtils';

/**
 * Debug utility for authentication operations
 * @param operation The name of the auth operation being debugged
 * @param callback The auth operation function to execute and debug
 * @returns The result of the callback function
 */
export async function debugAuthOperation<T>(operation: string, callback: () => Promise<T>): Promise<T> {
  try {
    DebugUtils.log('AuthDebug', `Auth operation '${operation}' started`);
    const result = await callback();
    DebugUtils.log('AuthDebug', `Auth operation '${operation}' completed`, result);
    return result;
  } catch (error) {
    DebugUtils.error('AuthDebug', `Auth operation '${operation}' failed`, error);
    throw error;
  }
}

/**
 * Debug utility for simple authentication operations
 * @param operation The name of the auth operation being debugged
 * @param data Any relevant data for the operation
 * @param error Any error that occurred during the operation
 */
export function debugAuthSimpleOperation(operation: string, data?: any, error?: any): void {
  if (error) {
    DebugUtils.error('AuthDebug', `Auth operation '${operation}' failed`, error);
    return;
  }
  
  DebugUtils.log('AuthDebug', `Auth operation '${operation}' executed`, data);
}

/**
 * Log Supabase configuration details for debugging
 * @param config The configuration object to log
 */
export function logSupabaseConfig(config: any): void {
  // Sanitize the config to remove sensitive information
  const safeConfig = { ...config };
  
  // Remove any keys or secrets
  if (safeConfig.key) safeConfig.key = '[REDACTED]';
  if (safeConfig.secret) safeConfig.secret = '[REDACTED]';
  if (safeConfig.serviceKey) safeConfig.serviceKey = '[REDACTED]';
  if (safeConfig.apiKey) safeConfig.apiKey = '[REDACTED]';
  
  DebugUtils.log('AuthDebug', 'Supabase configuration', safeConfig);
}

/**
 * Log authentication context for debugging
 * @param context The auth context to log
 */
export function logAuthContext(context: any): void {
  // Sanitize the context to remove sensitive information
  const safeContext = { ...context };
  
  // Remove any tokens or sensitive data
  if (safeContext.session?.access_token) safeContext.session.access_token = '[REDACTED]';
  if (safeContext.session?.refresh_token) safeContext.session.refresh_token = '[REDACTED]';
  
  DebugUtils.log('AuthDebug', 'Auth context', safeContext);
}

/**
 * Inspect the current authentication state
 * @param authState The current auth state to inspect
 */
export function inspectAuthState(authState: any): void {
  // Create a safe copy of the auth state
  const safeState = { ...authState };
  
  // Remove sensitive information
  if (safeState.session?.access_token) safeState.session.access_token = '[REDACTED]';
  if (safeState.session?.refresh_token) safeState.session.refresh_token = '[REDACTED]';
  
  // Extract useful information
  const userInfo = safeState.user ? {
    id: safeState.user.id,
    email: safeState.user.email,
    role: safeState.user.user_metadata?.role || 'unknown',
    confirmed: safeState.user.confirmed_at ? true : false,
    lastSignIn: safeState.user.last_sign_in_at,
    createdAt: safeState.user.created_at
  } : null;
  
  DebugUtils.log('AuthDebug', 'Auth state inspection', {
    isAuthenticated: !!safeState.user,
    userInfo,
    sessionExpires: safeState.session?.expires_at ? new Date(safeState.session.expires_at * 1000).toISOString() : null,
    provider: safeState.user?.app_metadata?.provider || 'unknown'
  });
}
