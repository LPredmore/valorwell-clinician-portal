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
  
  // Simplified loading and initialization state
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // Single safety timeout to prevent UI deadlocks
  useEffect(() => {
    const safetyTimeoutId = setTimeout(() => {
      if (!authInitialized) {
        console.warn('[UserContext] Auth initialization timed out, forcing initialized state');
        setAuthInitialized(true);
        setIsLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(safetyTimeoutId);
  }, [authInitialized]);

  /**
   * Fetches client-specific data for an authenticated user
   * @param currentAuthUser The authenticated Supabase user
   */
  const fetchClientSpecificData = useCallback(async (currentAuthUser: SupabaseUser) => {
    setIsLoading(true);
    setAuthInitialized(true);

    try {
      // Get user role from metadata or default to client
      const role = currentAuthUser.user_metadata?.role || 'client';
      setUserRole(role);

      // Only fetch client data for relevant roles
      if (role === 'client' || role === 'admin' || role === 'clinician') {
        try {
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
              setClientStatus('ErrorFetchingStatus');
              setClientProfile(null);
            }
          } else if (clientData) {
            setClientProfile(clientData as ClientProfile);
            setClientStatus(clientData.client_status || 'New');
            logInfo('[UserContext] Set clientProfile with age:', clientData.client_age, 'and status:', clientData.client_status);
          } else {
            setClientStatus('New'); setClientProfile(null);
          }
        } catch (e) {
          logError('[UserContext] Exception fetching client data:', e);
          setClientStatus('ErrorFetchingStatus'); setClientProfile(null);
        }
      } else {
        setClientStatus(null); setClientProfile(null);
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

  // Simplified main effect for initialization and auth state changes
  useEffect(() => {
    logInfo("[UserContext] Setting up auth initialization");
    let isMounted = true;
    
    // Start loading
    setIsLoading(true);
    
    // Create a single async function to handle the initial auth check
    const initializeAuth = async () => {
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        logInfo("[UserContext] Initial session check complete:",
          session ? `User ID: ${session.user.id}` : "No active session");
        
        // Set basic user data
        setUser(session?.user || null);
        setUserId(session?.user?.id || null);
        
        // If we have a user, fetch their specific data
        if (session?.user) {
          await fetchClientSpecificData(session.user);
        } else {
          // No user, reset all user-specific state
          setUserRole(null);
          setClientStatus(null);
          setClientProfile(null);
        }
        
        // Mark auth as initialized and not loading
        if (isMounted) {
          setAuthInitialized(true);
          setIsLoading(false);
          logInfo("[UserContext] Auth initialization complete");
        }
      } catch (error) {
        logError("[UserContext] Error during auth initialization:", error);
        
        // Even on error, mark auth as initialized to prevent UI deadlocks
        if (isMounted) {
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
        
        logInfo(`[UserContext] Auth state changed: ${event}`);
        
        try {
          // Update basic user data immediately
          setUser(session?.user || null);
          setUserId(session?.user?.id || null);
          
          // Handle session changes
          if (session?.user) {
            // User signed in or session refreshed
            await fetchClientSpecificData(session.user);
          } else {
            // User signed out
            setUserRole(null);
            setClientStatus(null);
            setClientProfile(null);
            setIsLoading(false);
          }
          
          // Ensure auth is marked as initialized
          setAuthInitialized(true);
        } catch (error) {
          logError("[UserContext] Error handling auth state change:", error);
          
          // Ensure we're not stuck in loading state
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
  }, [fetchClientSpecificData]);

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
