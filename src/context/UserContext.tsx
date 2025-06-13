import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { updateAuthDebugState, logAuthDebugInfo } from '@/debug/authDebugUtils';

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

interface UserContextType {
  user: SupabaseUser | null;
  userId: string | null;
  userRole: string | null;
  clientStatus: ClientProfile['client_status'] | null;
  clientProfile: ClientProfile | null;
  isLoading: boolean;
  authInitialized: boolean;
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
  // Additional properties for better error handling
  authState: AuthState;
  authError: Error | null;
}

// Environment-based logging control
const isDev = process.env.NODE_ENV === 'development';
const logInfo = isDev ? console.log : () => {};
const logError = console.error;

const UserContext = createContext<UserContextType | undefined>(undefined);

// Auth state machine states
type AuthState =
  | 'initializing' // Initial state, auth is being initialized
  | 'authenticated' // User is authenticated
  | 'unauthenticated' // User is not authenticated
  | 'error'; // Error occurred during authentication

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  
  // Safety timeout with increased duration (8 seconds)
  useEffect(() => {
    // Only apply safety timeout during initialization
    if (authState !== 'initializing') return;
    
    const safetyTimeoutId = setTimeout(() => {
      console.warn('[UserContext] Auth initialization timed out after 8 seconds');
      
      // Force transition to a stable state
      setAuthState('error');
      setAuthInitialized(true);
      setIsLoading(false);
      setAuthError(new Error('Authentication initialization timed out'));
      updateAuthDebugState('authentication_timeout');
      
      // Log timeout state
      logAuthDebugInfo({
        isLoading: false,
        authInitialized: true,
        authState: 'error',
        userId: null,
        userRole: null,
        authError: new Error('Authentication initialization timed out')
      });
    }, 8000);
    
    return () => clearTimeout(safetyTimeoutId);
  }, [authState]);

  /**
   * Fetches client-specific data for an authenticated user
   * @param currentAuthUser The authenticated Supabase user
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
          logInfo('[UserContext] Set clientProfile with age:', clientData.client_age, 'and status:', clientData.client_status);
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
      logError('[UserContext] Error in fetchClientSpecificData:', error);
      setClientStatus('ErrorFetchingStatus');
      setClientProfile(null);
      setAuthState('error');
      setAuthError(error as Error);
    } finally {
      // Always ensure these flags are set correctly
      setAuthInitialized(true);
      setIsLoading(false);
      logInfo("[UserContext] fetchClientSpecificData completed. authInitialized: true, isLoading: false");
    }
  }, []);

  // Main effect for auth initialization and state changes
  useEffect(() => {
    logInfo("[UserContext] Setting up auth initialization with state machine");
    let isMounted = true;
    
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        // Set initial state
        setAuthState('initializing');
        setIsLoading(true);
        setAuthInitialized(false);
        updateAuthDebugState('initializing');
        
        // Get the current session
        updateAuthDebugState('checking_session');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        // Handle session error
        if (sessionError) {
          updateAuthDebugState('authentication_error');
          throw sessionError;
        }
        
        updateAuthDebugState('session_retrieved');
        logInfo("[UserContext] Initial session check complete:",
          session ? `User ID: ${session.user.id}` : "No active session");
        
        // Set basic user data
        setUser(session?.user || null);
        setUserId(session?.user?.id || null);
        
        // If we have a user, fetch their specific data
        if (session?.user) {
          try {
            updateAuthDebugState('fetching_user_data');
            
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
                  logError('[UserContext] Error fetching client data:', error);
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
            
            updateAuthDebugState('user_data_retrieved');
            
            // Successfully authenticated
            setAuthState('authenticated');
          } catch (error) {
            logError('[UserContext] Error fetching user-specific data:', error);
            setAuthState('error');
            setAuthError(error as Error);
            updateAuthDebugState('authentication_error');
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
          updateAuthDebugState('authentication_complete');
          logInfo("[UserContext] Auth initialization complete with state:",
            session?.user ? 'authenticated' : 'unauthenticated');
          
          // Log complete auth debug info
          logAuthDebugInfo({
            isLoading: false,
            authInitialized: true,
            authState: session?.user ? 'authenticated' : 'unauthenticated',
            userId: session?.user?.id || null,
            userRole,
            authError: null
          });
        }
      } catch (error) {
        logError("[UserContext] Error during auth initialization:", error);
        
        if (isMounted) {
          // Set error state
          setAuthState('error');
          setAuthError(error as Error);
          updateAuthDebugState('authentication_error');
          
          // Even on error, mark auth as initialized to prevent UI deadlocks
          setAuthInitialized(true);
          setIsLoading(false);
          
          // Reset all user data on error
          setUser(null);
          setUserId(null);
          setUserRole(null);
          setClientStatus(null);
          setClientProfile(null);
          
          // Log error state
          logAuthDebugInfo({
            isLoading: false,
            authInitialized: true,
            authState: 'error',
            userId: null,
            userRole: null,
            authError: error
          });
        }
      }
    };
    
    // Start the initialization process
    initializeAuth();
    
    // Set up the auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        
        logInfo(`[UserContext] Auth state changed: ${event}`);
        
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
          logError("[UserContext] Error handling auth state change:", error);
          
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
      logInfo("[UserContext] Cleaning up auth subscription");
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const refreshUserData = useCallback(async () => {
    logInfo("[UserContext] refreshUserData explicitly called.");
    
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
        logInfo("[UserContext] refreshUserData: No active session, context reset.");
      }
    } catch (error) {
      logError("[UserContext] Error in refreshUserData:", error);
      setAuthState('error');
      setAuthError(error as Error);
    } finally {
      // Always ensure these flags are set correctly
      setAuthInitialized(true);
      setIsLoading(false);
    }
  }, [fetchClientSpecificData]);

  const logout = async () => {
    logInfo("[UserContext] Logging out user...");
    
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
      
      logInfo("[UserContext] Supabase signOut successful.");
      
      // Update state machine to unauthenticated
      setAuthState('unauthenticated');
      
      // Force a page reload after logout to clear any lingering state
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    } catch (error) {
      logError("[UserContext] Error during supabase.auth.signOut():", error);
      
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
      logInfo("[UserContext] Logout process finished. authState: unauthenticated");
    }
  };

  return (
    <UserContext.Provider
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
        // Additional context values for better error handling
        authState,
        authError
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
