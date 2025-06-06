
import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
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
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // Navigation state management to prevent auth interference
  const navigationInProgress = useRef(false);
  const authStateStable = useRef(false);
  const initializationComplete = useRef(false);

  /**
   * Fetches client-specific data for an authenticated user
   * Memoized with useCallback to prevent unnecessary effect triggers
   */
  const fetchClientSpecificData = useCallback(async (currentAuthUser: SupabaseUser) => {
    // Don't interfere if navigation is in progress
    if (navigationInProgress.current && authStateStable.current) {
      logInfo('[UserContext] Skipping client data fetch during navigation');
      return;
    }

    setIsLoading(true);

    try {
      // Get user role from metadata or default to client
      const role = currentAuthUser.user_metadata?.role || 'client';
      setUserRole(role);

      // Only fetch client data for relevant roles
      if (role === 'client' || role === 'admin' || role === 'clinician') {
        try {
          const { data: clientData, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', currentAuthUser.id)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              setClientStatus('New');
              setClientProfile(null);
            } else {
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
        setClientStatus(null); 
        setClientProfile(null);
      }
    } catch (error) {
      logError('[UserContext] Unexpected error in fetchClientSpecificData:', error);
      setClientStatus('ErrorFetchingStatus');
      setClientProfile(null);
    } finally {
      setAuthInitialized(true);
      setIsLoading(false);
      authStateStable.current = true;
      logInfo("[UserContext] fetchClientSpecificData completed. authInitialized: true, isLoading: false");
    }
  }, []); // Stable dependency array

  // Main effect for initialization and auth state changes
  useEffect(() => {
    logInfo("[UserContext] Main useEffect: Setting up initial session check and auth listener.");
    let isMounted = true;
    
    // Single initialization timeout instead of multiple competing ones
    const initTimeout = setTimeout(() => {
      if (isMounted && !initializationComplete.current) {
        setAuthInitialized(true);
        setIsLoading(false);
        authStateStable.current = true;
        initializationComplete.current = true;
        logInfo("[UserContext] Initialization timeout reached - auth state stabilized");
      }
    }, 5000);

    // 1. Initial Session Check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      logInfo("[UserContext] Initial getSession completed. Session user ID:", session?.user?.id || 'null');
      
      try {
        setUser(session?.user || null);
        setUserId(session?.user?.id || null);

        if (session?.user) {
          await fetchClientSpecificData(session.user);
        } else {
          setUserRole(null);
          setClientStatus(null);
          setClientProfile(null);
          setIsLoading(false);
        }
        
        if (isMounted) {
          setAuthInitialized(true);
          setIsLoading(false);
          authStateStable.current = true;
          initializationComplete.current = true;
          logInfo("[UserContext] Initial auth process finished successfully");
        }
      } catch (error) {
        logError("[UserContext] Error processing session data:", error);
        if (isMounted) {
          setAuthInitialized(true);
          setIsLoading(false);
          authStateStable.current = true;
          initializationComplete.current = true;
        }
      }
    }).catch(async (error) => {
      if (!isMounted) return;
      logError("[UserContext] Error in initial getSession:", error);
      
      setAuthInitialized(true);
      setIsLoading(false);
      authStateStable.current = true;
      initializationComplete.current = true;
      
      setUser(null); 
      setUserId(null); 
      setUserRole(null); 
      setClientStatus(null); 
      setClientProfile(null);
    });

    // 2. Auth State Change Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        logInfo(`[UserContext] onAuthStateChange event: ${event}, User: ${session?.user?.id || 'null'}`);
        
        // Don't process auth changes during navigation unless it's a sign out
        if (navigationInProgress.current && event !== 'SIGNED_OUT' && authStateStable.current) {
          logInfo('[UserContext] Skipping auth state change during navigation');
          return;
        }
        
        setAuthInitialized(true);
        
        try {
          const prevUserId = userId;
          logInfo(`[UserContext] Auth transition: userId ${prevUserId} → ${session?.user?.id || 'null'}`);
          
          setUser(session?.user || null);
          setUserId(session?.user?.id || null);

          if (session?.user) {
            // Only fetch client data if this is a meaningful auth change
            if (prevUserId !== session.user.id || !authStateStable.current) {
              await fetchClientSpecificData(session.user);
            }
          } else {
            // SIGNED_OUT or session became null
            setUserRole(null);
            setClientStatus(null);
            setClientProfile(null);
            setIsLoading(false);
            authStateStable.current = true;
            logInfo("[UserContext] User signed out - state cleared");
          }
        } catch (error) {
          logError("[UserContext] Error during auth state change processing:", error);
          setAuthInitialized(true);
          setIsLoading(false);
          authStateStable.current = true;
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
      logInfo("[UserContext] Cleaning up auth subscription (unmount).");
      authListener?.subscription?.unsubscribe();
    };
  }, []); // Removed fetchClientSpecificData from dependencies

  // Navigation state management
  useEffect(() => {
    const handleRouteChange = () => {
      navigationInProgress.current = true;
      logInfo('[UserContext] Navigation started');
      
      // Clear navigation flag after a short delay
      setTimeout(() => {
        navigationInProgress.current = false;
        logInfo('[UserContext] Navigation completed');
      }, 100);
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);
    
    // Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      handleRouteChange();
      return originalPushState.apply(this, args);
    };
    
    window.history.replaceState = function(...args) {
      handleRouteChange();
      return originalReplaceState.apply(this, args);
    };

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  const refreshUserData = useCallback(async () => {
    logInfo("[UserContext] refreshUserData explicitly called.");
    
    // Don't refresh during navigation unless explicitly needed
    if (navigationInProgress.current) {
      logInfo('[UserContext] Skipping refresh during navigation');
      return;
    }
    
    setAuthInitialized(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await fetchClientSpecificData(session.user);
      } else {
        setUser(null); 
        setUserId(null); 
        setUserRole(null);
        setClientStatus(null); 
        setClientProfile(null);
        setIsLoading(false);
        authStateStable.current = true;
        logInfo("[UserContext] refreshUserData: No active session, context reset.");
      }
    } catch (error) {
      logError("[UserContext] Error in refreshUserData:", error);
      setIsLoading(false);
    } finally {
      setAuthInitialized(true);
      setIsLoading(false);
      authStateStable.current = true;
    }
  }, [fetchClientSpecificData]);

  const logout = async () => {
    logInfo("[UserContext] Logging out user...");
    setIsLoading(true);
    
    setAuthInitialized(true);
    
    // Reset local state immediately
    setUser(null);
    setUserId(null);
    setUserRole(null);
    setClientStatus(null);
    setClientProfile(null);
    authStateStable.current = false;
    
    try {
      await supabase.auth.signOut({ scope: 'global' });
      logInfo("[UserContext] Supabase signOut successful.");
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    } catch (error) {
      logError("[UserContext] Error during supabase.auth.signOut():", error);
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    } finally {
      setAuthInitialized(true);
      setIsLoading(false);
      authStateStable.current = true;
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
