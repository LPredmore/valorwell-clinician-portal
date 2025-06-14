console.log('🚀 [EMERGENCY DEBUG] AuthProvider file loaded');

import React, { createContext, useContext, useEffect, ReactNode, useReducer } from 'react';
import { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Define client profile interface
export interface ClientProfile {
  client_id: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_preferred_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_status: 'Active' | 'Inactive' | 'Pending' | null;
  client_date_of_birth: string | null;
  client_age: number | null;
  client_gender: string | null;
  client_address: string | null;
  client_city: string | null;
  client_state: string | null;
  client_zipcode: string | null;
}

// Define auth state machine states
export type AuthState = 'initializing' | 'checking_session' | 'fetching_profile' | 'authenticated' | 'unauthenticated' | 'error' | 'logging_out';

// Define auth state machine events
type AuthEvent =
  | { type: 'INITIALIZE' }
  | { type: 'SESSION_CHECKED', session: Session | null, error?: Error }
  | { type: 'PROFILE_FETCHED', profile: ClientProfile | null }
  | { type: 'AUTH_ERROR', error: Error }
  | { type: 'LOGOUT' }
  | { type: 'LOGOUT_SUCCESS' }
  | { type: 'LOGOUT_ERROR', error: Error }
  | { type: 'REFRESH' };

// Define auth state machine context
interface AuthMachineContext {
  user: SupabaseUser | null;
  userRole: string | null;
  clientProfile: ClientProfile | null;
  authError: Error | null;
  isLoading: boolean;
  authInitialized: boolean;
}

// Define auth state machine state
interface AuthMachineState {
  state: AuthState;
  context: AuthMachineContext;
}

// Define initial state
const initialState: AuthMachineState = {
  state: 'initializing',
  context: {
    user: null,
    userRole: null,
    clientProfile: null,
    authError: null,
    isLoading: true,
    authInitialized: false
  }
};

// Define auth state machine reducer
const authReducer = (state: AuthMachineState, event: AuthEvent): AuthMachineState => {
  console.log(`🚀 [AUTH STATE MACHINE] Current state: ${state.state}, Event: ${event.type}`);
  
  switch (state.state) {
    case 'initializing':
      if (event.type === 'INITIALIZE') {
        return {
          state: 'checking_session',
          context: {
            ...state.context,
            authInitialized: true
          }
        };
      }
      return state;
      
    case 'checking_session':
      if (event.type === 'SESSION_CHECKED') {
        if (event.error) {
          return {
            state: 'error',
            context: {
              ...state.context,
              authError: event.error,
              isLoading: false
            }
          };
        }
        
        if (event.session?.user) {
          return {
            state: 'fetching_profile',
            context: {
              ...state.context,
              user: event.session.user,
              userRole: event.session.user.user_metadata?.role || null
            }
          };
        }
        
        return {
          state: 'unauthenticated',
          context: {
            ...state.context,
            isLoading: false
          }
        };
      }
      return state;
      
    case 'fetching_profile':
      if (event.type === 'PROFILE_FETCHED') {
        return {
          state: 'authenticated',
          context: {
            ...state.context,
            clientProfile: event.profile,
            isLoading: false
          }
        };
      }
      
      if (event.type === 'AUTH_ERROR') {
        return {
          state: 'error',
          context: {
            ...state.context,
            authError: event.error,
            isLoading: false
          }
        };
      }
      return state;
      
    case 'authenticated':
      if (event.type === 'LOGOUT') {
        return {
          state: 'logging_out',
          context: {
            ...state.context,
            isLoading: true
          }
        };
      }
      
      if (event.type === 'REFRESH') {
        return {
          state: 'checking_session',
          context: {
            ...state.context,
            isLoading: true
          }
        };
      }
      return state;
      
    case 'unauthenticated':
      if (event.type === 'REFRESH') {
        return {
          state: 'checking_session',
          context: {
            ...state.context,
            isLoading: true
          }
        };
      }
      return state;
      
    case 'logging_out':
      if (event.type === 'LOGOUT_SUCCESS') {
        return {
          state: 'unauthenticated',
          context: {
            ...initialState.context,
            authInitialized: true,
            isLoading: false
          }
        };
      }
      
      if (event.type === 'LOGOUT_ERROR') {
        return {
          state: 'error',
          context: {
            ...state.context,
            authError: event.error,
            isLoading: false
          }
        };
      }
      return state;
      
    case 'error':
      if (event.type === 'REFRESH') {
        return {
          state: 'checking_session',
          context: {
            ...state.context,
            authError: null,
            isLoading: true
          }
        };
      }
      return state;
      
    default:
      return state;
  }
};

// Define auth context type
interface AuthContextType extends AuthMachineContext {
  authState: AuthState;
  userId: string | null;
  clientStatus: ClientProfile['client_status'] | null;
  refreshUserData: () => void;
  logout: () => Promise<void>;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define timeout for safety
const SAFETY_TIMEOUT = 10000; // 10 seconds

// Create auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log('🚀 [EMERGENCY DEBUG] AuthProvider component rendering');
  
  // Initialize auth state machine
  const [machine, dispatch] = useReducer(authReducer, initialState);
  
  // Extract values from state machine
  const { state: authState, context } = machine;
  const { user, userRole, clientProfile, authError, isLoading, authInitialized } = context;
  
  // Define fetch client profile function
  const fetchClientProfile = async (userId: string): Promise<ClientProfile | null> => {
    try {
      console.log('🚀 [EMERGENCY DEBUG] Fetching client profile for user:', userId);
      
      // Create a timeout promise
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Client profile fetch timeout')), SAFETY_TIMEOUT);
      });
      
      // Create the fetch promise
      const fetchPromise = supabase
        .from('clients_compatibility_view')
        .select('*')
        .eq('id', userId)
        .single();
      
      // Race the promises
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (error) {
        console.warn('⚠️ [EMERGENCY DEBUG] No client profile found (this is normal for non-client users)');
        return null;
      }
      
      console.log('🚀 [EMERGENCY DEBUG] Client profile fetched successfully');
      return data;
    } catch (error) {
      console.error('❌ [EMERGENCY DEBUG] Error fetching client profile:', error);
      throw error;
    }
  };
  
  // Define refresh user data function
  const refreshUserData = (): void => {
    console.log('🚀 [EMERGENCY DEBUG] Refreshing user data...');
    dispatch({ type: 'REFRESH' });
  };
  
  // Define logout function
  const logout = async (): Promise<void> => {
    try {
      console.log('🚀 [EMERGENCY DEBUG] Logging out user...');
      dispatch({ type: 'LOGOUT' });
      
      // Create a timeout promise
      const timeoutPromise = new Promise<{ error: Error }>((_, reject) => {
        setTimeout(() => reject(new Error('Logout timeout')), SAFETY_TIMEOUT);
      });
      
      // Create the logout promise
      const logoutPromise = supabase.auth.signOut();
      
      // Race the promises
      const { error } = await Promise.race([logoutPromise, timeoutPromise]);
      
      if (error) {
        console.error('❌ [EMERGENCY DEBUG] Logout error:', error);
        dispatch({ type: 'LOGOUT_ERROR', error });
        throw error;
      }
      
      console.log('🚀 [EMERGENCY DEBUG] Logout successful');
      dispatch({ type: 'LOGOUT_SUCCESS' });
    } catch (error) {
      console.error('❌ [EMERGENCY DEBUG] Error during logout:', error);
      dispatch({ type: 'LOGOUT_ERROR', error: error as Error });
      throw error;
    }
  };
  
  // Initialize authentication
  useEffect(() => {
    console.log('🚀 [EMERGENCY DEBUG] AuthProvider useEffect - Setting up auth initialization');
    
    let mounted = true;
    let sessionTimeoutId: NodeJS.Timeout | null = null;
    let profileTimeoutId: NodeJS.Timeout | null = null;
    
    const initializeAuth = async () => {
      try {
        console.log('🚀 [EMERGENCY DEBUG] Starting auth initialization...');
        
        // Initialize the state machine
        dispatch({ type: 'INITIALIZE' });
        
        // Set up safety timeout for session check
        sessionTimeoutId = setTimeout(() => {
          if (mounted) {
            console.error('❌ [EMERGENCY DEBUG] Session check timed out');
            dispatch({
              type: 'SESSION_CHECKED',
              session: null,
              error: new Error('Session check timed out')
            });
          }
        }, SAFETY_TIMEOUT);
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Clear timeout
        if (sessionTimeoutId) {
          clearTimeout(sessionTimeoutId);
          sessionTimeoutId = null;
        }
        
        if (!mounted) return;
        
        if (error) {
          console.error('❌ [EMERGENCY DEBUG] Error getting initial session:', error);
          dispatch({ type: 'SESSION_CHECKED', session: null, error });
          return;
        }
        
        // Update state with session result
        dispatch({ type: 'SESSION_CHECKED', session });
        
        // If we have a user, fetch their profile
        if (session?.user) {
          try {
            // Set up safety timeout for profile fetch
            profileTimeoutId = setTimeout(() => {
              if (mounted) {
                console.error('❌ [EMERGENCY DEBUG] Profile fetch timed out');
                dispatch({
                  type: 'AUTH_ERROR',
                  error: new Error('Profile fetch timed out')
                });
              }
            }, SAFETY_TIMEOUT);
            
            const profile = await fetchClientProfile(session.user.id);
            
            // Clear timeout
            if (profileTimeoutId) {
              clearTimeout(profileTimeoutId);
              profileTimeoutId = null;
            }
            
            if (mounted) {
              dispatch({ type: 'PROFILE_FETCHED', profile });
            }
          } catch (profileError) {
            console.warn('⚠️ [EMERGENCY DEBUG] Error fetching client profile during init:', profileError);
            if (mounted) {
              dispatch({ type: 'AUTH_ERROR', error: profileError as Error });
            }
          }
        }
      } catch (error) {
        console.error('❌ [EMERGENCY DEBUG] Error in auth initialization:', error);
        if (mounted) {
          dispatch({ type: 'AUTH_ERROR', error: error as Error });
        }
      }
    };
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('🚀 [EMERGENCY DEBUG] Auth state change event:', event);
        
        if (!mounted) return;
        
        try {
          // Update state with session result
          dispatch({ type: 'SESSION_CHECKED', session });
          
          // If we have a user, fetch their profile
          if (session?.user) {
            try {
              const profile = await fetchClientProfile(session.user.id);
              if (mounted) {
                dispatch({ type: 'PROFILE_FETCHED', profile });
              }
            } catch (profileError) {
              console.warn('⚠️ [EMERGENCY DEBUG] Error fetching client profile on auth change:', profileError);
              if (mounted) {
                dispatch({ type: 'AUTH_ERROR', error: profileError as Error });
              }
            }
          }
        } catch (error) {
          console.error('❌ [EMERGENCY DEBUG] Error handling auth state change:', error);
          if (mounted) {
            dispatch({ type: 'AUTH_ERROR', error: error as Error });
          }
        }
      }
    );
    
    // Initialize
    initializeAuth();
    
    // Cleanup
    return () => {
      console.log('🚀 [EMERGENCY DEBUG] AuthProvider cleanup');
      mounted = false;
      
      if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
      }
      
      if (profileTimeoutId) {
        clearTimeout(profileTimeoutId);
      }
      
      subscription.unsubscribe();
    };
  }, []);
  
  // Create context value
  const value: AuthContextType = {
    user,
    userId: user?.id || null,
    userRole,
    clientStatus: clientProfile?.client_status || null,
    clientProfile,
    isLoading,
    authInitialized,
    refreshUserData,
    logout,
    authState,
    authError,
  };
  
  console.log('🚀 [EMERGENCY DEBUG] AuthProvider rendering with state:', {
    authState,
    hasUser: !!user,
    userRole,
    isLoading,
    authInitialized
  });
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Create auth hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('❌ [EMERGENCY DEBUG] useAuth must be used within an AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
