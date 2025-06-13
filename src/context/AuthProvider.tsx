import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface ClientProfile {
  id: string;
  client_first_name?: string;
  client_last_name?: string;
  client_preferred_name?: string;
  client_email?: string;
  client_phone?: string;
  client_status?: 'New' | 'Profile Complete' | 'Active' | 'Inactive' | string;
  client_is_profile_complete?: boolean;
  client_age?: number | null;
  client_state?: string | null;
  [key: string]: any; 
}

// Auth state machine states
export type AuthState =
  | 'initializing' // Initial state, auth is being initialized
  | 'authenticated' // User is authenticated
  | 'unauthenticated' // User is not authenticated
  | 'error'; // Error occurred during authentication

interface AuthContextType {
  user: SupabaseUser | null;
  userId: string | null;
  userRole: string | null;
  clientStatus: ClientProfile['client_status'] | null;
  clientProfile: ClientProfile | null;
  isLoading: boolean;
  authInitialized: boolean;
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
  authState: AuthState;
  authError: Error | null;
}

// Environment-based logging control
const isDev = process.env.NODE_ENV === 'development';
const logInfo = isDev ? console.log : () => {};
const logError = console.error;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User data state
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clientStatus, setClientStatus] = useState<ClientProfile['client_status'] | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  
  // Auth state machine
  const [authState, setAuthState] = useState<AuthState>('initializing');
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authError, setAuthError] = useState<Error | null>(null);
  
  // Centralized timeout mechanism - only one timeout instead of multiple competing ones
  useEffect(() => {
    // Only apply safety timeout during initialization
    if (authState !== 'initializing') return;
    
    const safetyTimeoutId = setTimeout(() => {
      console.warn('[AuthProvider] Auth initialization timed out after 10 seconds');
      
      // Force transition to a stable state
      setAuthState('error');
      setAuthInitialized(true);
      setIsLoading(false);
      setAuthError(new Error('Authentication initialization timed out'));
      
      // Log timeout state
      logInfo('[AuthProvider] Auth timeout occurred', {
        isLoading: false,
        authInitialized: true,
        authState: 'error'
      });
    }, 10000); // 10 seconds timeout
    
    return () => clearTimeout(safetyTimeoutId);
  }, [authState]);

  /**
   * Fetches client-specific data for an authenticated user
   */
  const fetchClientSpecificData = useCallback(async (currentAuthUser: SupabaseUser) => {
    try {
      // Start loading
      setIsLoading(true);
      
      // Get user role from metadata or default to client
      const role = currentAuthUser.user_metadata?.role || 'client';
      setUserRole(role);

      // Only fetch client data for relevant roles
      if (role === 'client' || role === 'admin' || role === 'clinician') {
        // Query client data from database
        const { data: clientData, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', currentAuthUser.id)
          .single();

        if (error) {
          // Handle specific error cases
          if (error.code === 'PGRST116') {
            // No data found - new client
            setClientStatus('New');
            setClientProfile(null);
          } else {
            // Other error
            throw error;
          }
        } else if (clientData) {
          setClientProfile(clientData as ClientProfile);
          setClientStatus(clientData.client_status || 'New');
          logInfo('[AuthProvider] Set clientProfile with status:', clientData.client_status);
        } else {
          setClientStatus('New');
          setClientProfile(null);
        }
      } else {
        setClientStatus(null);
        setClientProfile(null);
      }
      
      // Update auth state to authenticated
      setAuthState('authenticated');
    } catch (error) {
      logError('[AuthProvider] Error in fetchClientSpecificData:', error);
      setClientStatus('ErrorFetchingStatus');
      setClientProfile(null);
      setAuthState('error');
      setAuthError(error as Error);
    } finally {
      // Always ensure these flags are set correctly
      setAuthInitialized(true);
      setIsLoading(false);
    }
  }, []);

  // Main effect for auth initialization and state changes
  useEffect(() => {
    logInfo("[AuthProvider] Setting up auth initialization");
    let isMounted = true;
    
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        // Set initial state
        setAuthState('initializing');
        setIsLoading(true);
        setAuthInitialized(false);
        
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        // Handle session error
        if (sessionError) {
          throw sessionError;
        }
        
        logInfo("[AuthProvider] Initial session check complete:",
          session ? `User ID: ${session.user.id}` : "No active session");
        
        // Set basic user data
        setUser(session?.user || null);
        setUserId(session?.user?.id || null);
        
        // If we have a user, fetch their specific data
        if (session?.user) {
          try {
            // Get user role from metadata or default to client
            const role = session.user.user_metadata?.role || 'client';
            setUserRole(role);
            
            // Only fetch client data for relevant roles
            if (role === 'client' || role === 'admin' || role === 'clinician') {
              const { data: clientData, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', session.user.id)
                .single();
                
              if (error) {
                if (error.code === 'PGRST116') {
                  // No data found - new client
                  setClientStatus('New');
                  setClientProfile(null);
                } else {
                  // Other error
                  setClientStatus('ErrorFetchingStatus');
                  setClientProfile(null);
                  logError('[AuthProvider] Error fetching client data:', error);
                }
              } else if (clientData) {
                setClientProfile(clientData as ClientProfile);
                setClientStatus(clientData.client_status || 'New');
              } else {
                setClientStatus('New');
                setClientProfile(null);
              }
            } else {
              setClientStatus(null);
              setClientProfile(null);
            }
            
            // Successfully authenticated
            setAuthState('authenticated');
          } catch (error) {
            logError('[AuthProvider] Error fetching user-specific data:', error);
            setAuthState('error');
            setAuthError(error as Error);
          }
        } else {
          // No user, reset all user-specific state
          setUserRole(null);
          setClientStatus(null);
          setClientProfile(null);
          setAuthState('unauthenticated');
        }
        
        // Mark auth as initialized and not loading regardless of outcome
        if (isMounted) {
          setAuthInitialized(true);
          setIsLoading(false);
          logInfo("[AuthProvider] Auth initialization complete with state:",
            session?.user ? 'authenticated' : 'unauthenticated');
        }
      } catch (error) {
        logError("[AuthProvider] Error during auth initialization:", error);
        
        if (isMounted) {
          // Set error state
          setAuthState('error');
          setAuthError(error as Error);
          
          // Even on error, mark auth as initialized to prevent UI deadlocks
          setAuthInitialized(true);
          setIsLoading(false);
          
          // Reset all user data on error
          setUser(null);
          setUserId(null);
          setUserRole(null);
          setClientStatus(null);
          setClientProfile(null);
        }
      }
    };
    
    // Start the initialization process
    initializeAuth();
    
    // Set up the auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        
        logInfo(`[AuthProvider] Auth state changed: ${event}`);
        
        try {
          // Update basic user data immediately
          setUser(session?.user || null);
          setUserId(session?.user?.id || null);
          
          // Handle session changes
          if (session?.user) {
            // User signed in or session refreshed
            setAuthState('authenticated');
            await fetchClientSpecificData(session.user);
          } else {
            // User signed out
            setUserRole(null);
            setClientStatus(null);
            setClientProfile(null);
            setIsLoading(false);
            setAuthState('unauthenticated');
          }
          
          // Ensure auth is marked as initialized
          setAuthInitialized(true);
        } catch (error) {
          logError("[AuthProvider] Error handling auth state change:", error);
          
          // Set error state but keep auth initialized
          setAuthState('error');
          setAuthError(error as Error);
          setIsLoading(false);
          setAuthInitialized(true);
        }
      }
    );
    
    // Cleanup function
    return () => {
      isMounted = false;
      logInfo("[AuthProvider] Cleaning up auth subscription");
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchClientSpecificData]);

  const refreshUserData = useCallback(async () => {
    logInfo("[AuthProvider] refreshUserData explicitly called.");
    
    try {
      // Set loading state but keep auth initialized
      setIsLoading(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }
      
      if (session?.user) {
        // Update auth state
        setAuthState('authenticated');
        await fetchClientSpecificData(session.user);
      } else {
        // No active user to refresh, ensure state is clean
        setUser(null);
        setUserId(null);
        setUserRole(null);
        setClientStatus(null);
        setClientProfile(null);
        setAuthState('unauthenticated');
        logInfo("[AuthProvider] refreshUserData: No active session, context reset.");
      }
    } catch (error) {
      logError("[AuthProvider] Error in refreshUserData:", error);
      setAuthState('error');
      setAuthError(error as Error);
    } finally {
      // Always ensure these flags are set correctly
      setAuthInitialized(true);
      setIsLoading(false);
    }
  }, [fetchClientSpecificData]);

  const logout = async () => {
    logInfo("[AuthProvider] Logging out user...");
    
    try {
      // Update state machine first
      setAuthState('initializing');
      setIsLoading(true);
      
      // Reset local state immediately for faster UI feedback
      setUser(null);
      setUserId(null);
      setUserRole(null);
      setClientStatus(null);
      setClientProfile(null);
      
      // Force a logout to clean all tokens
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        throw error;
      }
      
      logInfo("[AuthProvider] Supabase signOut successful.");
      
      // Update state machine to unauthenticated
      setAuthState('unauthenticated');
      
      // Force a page reload after logout to clear any lingering state
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    } catch (error) {
      logError("[AuthProvider] Error during supabase.auth.signOut():", error);
      
      // Set error state
      setAuthState('error');
      setAuthError(error as Error);
      
      // Even if there's an error, redirect to login
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    } finally {
      // Always ensure these flags are set correctly
      setAuthInitialized(true);
      setIsLoading(false);
      logInfo("[AuthProvider] Logout process finished. authState: unauthenticated");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userId,
        userRole,
        clientStatus,
        clientProfile,
        isLoading,
        authInitialized,
        refreshUserData,
        logout,
        authState,
        authError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};