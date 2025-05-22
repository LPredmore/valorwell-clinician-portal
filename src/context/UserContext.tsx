
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
}

// Environment-based logging control
const isDev = process.env.NODE_ENV === 'development';
const logInfo = isDev ? console.log : () => {};
const logError = console.error;

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clientStatus, setClientStatus] = useState<ClientProfile['client_status'] | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  
  const [isLoading, setIsLoading] = useState(true); 
  // CRITICAL FIX: Start with authInitialized set to false, but set it to true in multiple paths
  const [authInitialized, setAuthInitialized] = useState(false);

  // Set multiple safety timeouts to ensure authInitialized is eventually set to true
  useEffect(() => {
    // Independent safety timeout that doesn't depend on authInitialized state
    const safetyTimeoutId = setTimeout(() => {
      logInfo("[UserContext] Safety timeout reached (3s) - forcing authInitialized to true");
      setAuthInitialized(true);
      setIsLoading(false);
    }, 3000); 
    
    // Secondary extended timeout for extra protection
    const extendedTimeoutId = setTimeout(() => {
      logInfo("[UserContext] Extended safety timeout reached (5s) - double-checking authInitialized is true");
      setAuthInitialized(true);
      setIsLoading(false);
    }, 5000);
    
    return () => {
      clearTimeout(safetyTimeoutId);
      clearTimeout(extendedTimeoutId);
    };
  }, []); // No dependencies - this runs once on mount

  // Fetches client-specific data if a user is authenticated.
  const fetchClientSpecificData = useCallback(async (currentAuthUser: SupabaseUser) => {
    logInfo("[UserContext] fetchClientSpecificData called for user:", currentAuthUser.id);
    setIsLoading(true); // Indicate loading for this specific fetch operation
    
    // CRITICAL FIX: Set authInitialized true as early as possible
    setAuthInitialized(true);

    try {
      const role = currentAuthUser.user_metadata?.role || 'client';
      setUserRole(role);
      logInfo(`[UserContext] User role set: ${role}`);

      if (role === 'client') {
        try {
          const { data: clientData, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', currentAuthUser.id)
            .single();

          if (error) {
            logError('[UserContext] Error fetching client data:', error);
            if (error.code === 'PGRST116') {
              setClientStatus('New');
              setClientProfile(null);
            } else {
              logError('[UserContext] Non-404 error fetching client data:', error);
              setClientStatus('ErrorFetchingStatus');
              setClientProfile(null);
            }
          } else if (clientData) {
            setClientProfile(clientData as ClientProfile);
            setClientStatus(clientData.client_status || 'New');
            logInfo('[UserContext] Set clientProfile with age:', clientData.client_age, 'and status:', clientData.client_status);
          } else {
            setClientStatus('New');
            setClientProfile(null);
          }
        } catch (e) {
          logError('[UserContext] Exception fetching client data:', e);
          setClientStatus('ErrorFetchingStatus');
          setClientProfile(null);
        }
      } else {
        // Skip client data fetch for non-client roles
        setClientStatus(null);
        setClientProfile(null);
        logInfo('[UserContext] Skipping client data fetch for role:', role);
      }
    } catch (error) {
      logError('[UserContext] Unexpected error in fetchClientSpecificData:', error);
      setClientStatus('ErrorFetchingStatus');
      setClientProfile(null);
    } finally {
      // CRITICAL FIX: Always ensure these flags are set correctly
      setAuthInitialized(true);
      setIsLoading(false);
      logInfo("[UserContext] fetchClientSpecificData completed. authInitialized: true, isLoading: false");
    }
  }, []);

  // Main effect for initialization and auth state changes
  useEffect(() => {
    logInfo("[UserContext] Main useEffect: Setting up initial session check and auth listener.");
    let isMounted = true;
    setIsLoading(true); // Overall loading starts
    
    // CRITICAL FIX: Set authInitialized to true immediately in the main effect
    // to prevent deadlocks, then check if we need to revert it based on actual state
    setAuthInitialized(true);

    // 1. Initial Session Check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      logInfo("[UserContext] Initial getSession completed. Session user ID:", session?.user?.id || 'null');
      
      try {
        setUser(session?.user || null);
        setUserId(session?.user?.id || null);

        if (session?.user) {
          // fetchClientSpecificData will set isLoading true then false for its own operation
          await fetchClientSpecificData(session.user);
        } else {
          // No initial session, reset client specific data
          setUserRole(null);
          setClientStatus(null);
          setClientProfile(null);
          setIsLoading(false); // Explicitly set loading to false when no user
        }
        
        if (isMounted) {
          // Ensure authInitialized is set to true and isLoading is false
          setAuthInitialized(true);
          setIsLoading(false);
          logInfo("[UserContext] Initial auth process finished. authInitialized: true, isLoading: false");
        }
      } catch (error) {
        logError("[UserContext] Error processing session data:", error);
        if (isMounted) {
          setAuthInitialized(true); // Ensure flag is set even on error
          setIsLoading(false); // Prevent loading state from getting stuck
        }
      }
    }).catch(async (error) => {
      if (!isMounted) return;
      logError("[UserContext] Error in initial getSession:", error);
      
      // Even on error, we need to set authInitialized to true to prevent deadlocks
      setAuthInitialized(true);
      setIsLoading(false);
      
      setUser(null); setUserId(null); setUserRole(null); setClientStatus(null); setClientProfile(null);
      logInfo("[UserContext] Initial auth process finished (with error). authInitialized: true, isLoading: false");
    });

    // 2. Auth State Change Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        logInfo(`[UserContext] onAuthStateChange event: ${event}, User: ${session?.user?.id || 'null'}`);
        
        // CRITICAL FIX: Always ensure authInitialized is true when auth state changes
        setAuthInitialized(true);
        
        try {
          // Log detailed before/after state transitions for debugging
          const prevUserId = userId;
          logInfo(`[UserContext] Auth transition: userId ${prevUserId} → ${session?.user?.id || 'null'}`);
          
          setUser(session?.user || null);
          setUserId(session?.user?.id || null);

          if (session?.user) {
            // Handle the session update in a separate async function to prevent deadlocks
            setTimeout(async () => {
              if (isMounted) {
                await fetchClientSpecificData(session.user);
                // Double-check authInitialized is true after fetchClientSpecificData
                setAuthInitialized(true);
                logInfo(`[UserContext] onAuthStateChange: User is signed in, authInitialized is true.`);
              }
            }, 0);
          } else {
            // SIGNED_OUT or session became null
            setUserRole(null);
            setClientStatus(null);
            setClientProfile(null);
            setIsLoading(false); // No user, so not loading user-specific data
            logInfo("[UserContext] onAuthStateChange: User signed out or session null. isLoading set to false.");
          }
        } catch (error) {
          // ENHANCED ERROR HANDLING: Handle any errors in the auth state change process
          logError("[UserContext] Error during auth state change processing:", error);
          setAuthInitialized(true); // Ensure flag is set even on error
          setIsLoading(false); // Ensure we're not stuck in loading state
        } finally {
          // CRITICAL FIX: Final safety check to ensure flags are properly set
          if (isMounted) {
            setAuthInitialized(true);
            // Only set isLoading to false if we're not in the middle of fetchClientSpecificData
            if (!session?.user) {
              setIsLoading(false);
            }
          }
        }
      }
    );

    return () => {
      isMounted = false;
      logInfo("[UserContext] Cleaning up auth subscription (unmount).");
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchClientSpecificData]); // CRITICAL FIX: Removed authInitialized from dependency array

  const refreshUserData = useCallback(async () => {
    logInfo("[UserContext] refreshUserData explicitly called.");
    
    // CRITICAL FIX: Ensure authInitialized is true before any async operations
    setAuthInitialized(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession(); // Get current session
      
      if (session?.user) {
          await fetchClientSpecificData(session.user); // This will set isLoading true/false
          
          // CRITICAL FIX: Double-check authInitialized is true after fetchClientSpecificData
          setAuthInitialized(true);
      } else {
          // No active user to refresh, ensure state is clean and not loading
          setUser(null); setUserId(null); setUserRole(null);
          setClientStatus(null); setClientProfile(null);
          setIsLoading(false); // No data to load
          logInfo("[UserContext] refreshUserData: No active session, context reset.");
      }
    } catch (error) {
      logError("[UserContext] Error in refreshUserData:", error);
      setIsLoading(false); // Ensure we're not stuck in loading state
    } finally {
      // ENHANCED ERROR HANDLING: Final safety check
      setAuthInitialized(true);
      setIsLoading(false); // Ensure we're not stuck in loading state
    }
  }, [fetchClientSpecificData]);

  const logout = async () => {
    logInfo("[UserContext] Logging out user...");
    setIsLoading(true); // Indicate process starting
    
    // CRITICAL FIX: Ensure authInitialized is true before any async operations
    setAuthInitialized(true);
    
    // Reset local state immediately for faster UI feedback
    setUser(null);
    setUserId(null);
    setUserRole(null);
    setClientStatus(null);
    setClientProfile(null);
    
    try {
      // Force a logout to clean all tokens
      await supabase.auth.signOut({ scope: 'global' });
      logInfo("[UserContext] Supabase signOut successful.");
      
      // Force a page reload after logout to clear any lingering state
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    } catch (error) {
      logError("[UserContext] Error during supabase.auth.signOut():", error);
      // Even if there's an error, redirect to login
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    } finally {
      // ENHANCED ERROR HANDLING: Always ensure these flags are set correctly
      setAuthInitialized(true);
      setIsLoading(false);
      logInfo("[UserContext] Logout process finished. authInitialized: true, isLoading: false");
    }
  };

  return (
    <UserContext.Provider value={{ user, userId, userRole, clientStatus, clientProfile, isLoading, authInitialized, refreshUserData, logout }}>
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
