
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
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

  // Circuit breaker to prevent infinite loops
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const fetchAttemptsRef = useRef(0);
  const MAX_FETCH_ATTEMPTS = 3;
  const lastUserIdRef = useRef<string | null>(null);

  // STEP 1: Extract resetCircuitBreaker as standalone useCallback
  const resetCircuitBreaker = useCallback(() => {
    fetchAttemptsRef.current = 0;
    setFetchAttempts(0);
    lastUserIdRef.current = null;
    logInfo("[UserContext] Circuit breaker reset");
  }, []);

  /**
   * Determine user role from metadata and database (supports dual admin-clinician roles)
   */
  const determineUserRole = useCallback(async (currentAuthUser: SupabaseUser): Promise<string> => {
    try {
      // First, check user metadata for role
      const metadataRole = currentAuthUser.user_metadata?.role;
      
      if (metadataRole === 'admin') {
        logInfo('[UserContext] Role from metadata: admin');
        return 'admin';
      }
      
      if (metadataRole === 'clinician') {
        // Check if clinician has admin privileges
        const { data: clinicianData, error: clinicianError } = await supabase
          .from('clinicians')
          .select('id, is_admin')
          .eq('id', currentAuthUser.id)
          .maybeSingle();

        if (!clinicianError && clinicianData) {
          const role = clinicianData.is_admin ? 'admin' : 'clinician';
          logInfo('[UserContext] Clinician role determined:', role);
          return role;
        }
        
        return 'clinician'; // Fallback if not found in table
      }
      
      if (metadataRole === 'client') {
        logInfo('[UserContext] Role from metadata: client');
        return 'client';
      }

      // If no metadata role, check which table the user exists in
      // Check clinicians table
      const { data: clinicianData, error: clinicianError } = await supabase
        .from('clinicians')
        .select('id, is_admin')
        .eq('id', currentAuthUser.id)
        .maybeSingle();

      if (!clinicianError && clinicianData) {
        // If clinician has admin flag, they are an admin
        if (clinicianData.is_admin) {
          logInfo('[UserContext] Role determined from clinicians table: admin (is_admin=true)');
          return 'admin';
        } else {
          logInfo('[UserContext] Role determined from clinicians table: clinician');
          return 'clinician';
        }
      }

      // Check clients table
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', currentAuthUser.id)
        .maybeSingle();

      if (!clientError && clientData) {
        logInfo('[UserContext] Role determined from clients table: client');
        return 'client';
      }

      // Default to client if not found elsewhere
      logInfo('[UserContext] Role defaulted to: client');
      return 'client';
    } catch (error) {
      logError('[UserContext] Error determining user role:', error);
      return 'client'; // Safe default
    }
  }, []);

  /**
   * Fetches user-specific data based on their role
   */
  const fetchUserData = useCallback(async (currentAuthUser: SupabaseUser) => {
    // Circuit breaker check
    if (fetchAttemptsRef.current >= MAX_FETCH_ATTEMPTS) {
      logError('[UserContext] Max fetch attempts reached, preventing infinite loop');
      setAuthInitialized(true);
      setIsLoading(false);
      return;
    }

    // Prevent duplicate fetches for same user
    if (lastUserIdRef.current === currentAuthUser.id && fetchAttemptsRef.current > 0) {
      logInfo('[UserContext] Duplicate fetch prevented for user:', currentAuthUser.id);
      return;
    }

    lastUserIdRef.current = currentAuthUser.id;
    fetchAttemptsRef.current += 1;
    setFetchAttempts(fetchAttemptsRef.current);
    setIsLoading(true);
    setAuthInitialized(true);

    try {
      // Determine user role
      const role = await determineUserRole(currentAuthUser);
      setUserRole(role);

      // Only fetch client data if user is actually a client
      if (role === 'client') {
        try {
          const { data: clientData, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', currentAuthUser.id)
            .maybeSingle();

          if (error) {
            if (error.code === 'PGRST116') {
              // No client data found - new client
              setClientStatus('New');
              setClientProfile(null);
            } else {
              logError('[UserContext] Error fetching client data:', error);
              setClientStatus('ErrorFetchingStatus');
              setClientProfile(null);
            }
          } else if (clientData) {
            setClientProfile(clientData as ClientProfile);
            setClientStatus(clientData.client_status || 'New');
            logInfo('[UserContext] Client data fetched successfully');
          }
        } catch (e) {
          logError('[UserContext] Exception fetching client data:', e);
          setClientStatus('ErrorFetchingStatus');
          setClientProfile(null);
        }
        } else {
        // For admins and clinicians, clear client-specific data
        setClientStatus(null);
        setClientProfile(null);
        logInfo('[UserContext] User is', role, '- no client data needed');
      }
    } catch (error) {
      logError('[UserContext] Error in fetchUserData:', error);
      setClientStatus('ErrorFetchingStatus');
      setClientProfile(null);
    } finally {
      setAuthInitialized(true);
      setIsLoading(false);
      logInfo("[UserContext] fetchUserData completed");
    }
  }, [determineUserRole]);

  // STEP 2: Extract refreshUserData as standalone useCallback (before useMemo)
  const refreshUserData = useCallback(async () => {
    logInfo("[UserContext] refreshUserData called");
    setAuthInitialized(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        resetCircuitBreaker(); // Reset counter
        await fetchUserData(session.user);
      } else {
        setUser(null);
        setUserId(null);
        setUserRole(null);
        setClientStatus(null);
        setClientProfile(null);
        setIsLoading(false);
      }
    } catch (error) {
      logError("[UserContext] Error in refreshUserData:", error);
      setIsLoading(false);
    } finally {
      setAuthInitialized(true);
    }
  }, [fetchUserData, resetCircuitBreaker]);

  // STEP 3: Extract logout as standalone useCallback (before useMemo)
  const logout = useCallback(async () => {
    logInfo("[UserContext] Logging out user...");
    setIsLoading(true);
    setAuthInitialized(true);
    
    // Reset local state immediately
    setUser(null);
    setUserId(null);
    setUserRole(null);
    setClientStatus(null);
    setClientProfile(null);
    setFetchAttempts(0);
    
    try {
      await supabase.auth.signOut({ scope: 'global' });
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    } catch (error) {
      logError("[UserContext] Error during logout:", error);
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    } finally {
      setAuthInitialized(true);
      setIsLoading(false);
    }
  }, []);

  // Safety mechanism to ensure auth state is properly initialized
  useEffect(() => {
    const safetyTimeoutId = setTimeout(() => {
      setAuthInitialized(true);
      setIsLoading(false);
    }, 5000);
    
    return () => clearTimeout(safetyTimeoutId);
  }, []);

  // Main effect for initialization and auth state changes
  useEffect(() => {
    logInfo("[UserContext] Setting up auth listener");
    let isMounted = true;
    setIsLoading(true);
    setAuthInitialized(true);

    // 1. Initial Session Check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      logInfo("[UserContext] Initial session check completed");
      
      try {
        setUser(session?.user || null);
        setUserId(session?.user?.id || null);

        if (session?.user) {
          resetCircuitBreaker(); // Reset for new session
          await fetchUserData(session.user);
        } else {
          // No session, reset all data
          setUserRole(null);
          setClientStatus(null);
          setClientProfile(null);
          setIsLoading(false);
          resetCircuitBreaker();
        }
        
        if (isMounted) {
          setAuthInitialized(true);
          setIsLoading(false);
        }
      } catch (error) {
        logError("[UserContext] Error processing initial session:", error);
        if (isMounted) {
          setAuthInitialized(true);
          setIsLoading(false);
        }
      }
    }).catch((error) => {
      if (!isMounted) return;
      logError("[UserContext] Error in initial getSession:", error);
      setAuthInitialized(true);
      setIsLoading(false);
      // Reset all state on error
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
        logInfo(`[UserContext] Auth state change: ${event}`);
        
        setAuthInitialized(true);
        
        try {
          setUser(session?.user || null);
          setUserId(session?.user?.id || null);

          if (session?.user) {
            // Reset circuit breaker on new session
            resetCircuitBreaker();
            // Handle the session update asynchronously to prevent deadlocks
            setTimeout(async () => {
              if (isMounted) {
                await fetchUserData(session.user);
              }
            }, 0);
          } else {
            // User signed out
            setUserRole(null);
            setClientStatus(null);
            setClientProfile(null);
            setIsLoading(false);
            resetCircuitBreaker();
          }
        } catch (error) {
          logError("[UserContext] Error during auth state change:", error);
          setAuthInitialized(true);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchUserData, resetCircuitBreaker]);

  // STEP 4: Update contextValue useMemo to ONLY reference callbacks (no useCallback inside)
  const contextValue = useMemo(() => ({
    user, 
    userId, 
    userRole, 
    clientStatus, 
    clientProfile, 
    isLoading, 
    authInitialized, 
    refreshUserData, // Reference extracted callback - NO useCallback here
    logout           // Reference extracted callback - NO useCallback here
  }), [
    user, 
    userId, 
    userRole, 
    clientStatus, 
    clientProfile, 
    isLoading, 
    authInitialized, 
    refreshUserData, 
    logout
  ]);

  return (
    <UserContext.Provider value={contextValue}>
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
