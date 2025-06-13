console.log('🚀 [EMERGENCY DEBUG] AuthProvider file loaded');

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface ClientProfile {
  client_id: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_preferred_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_status: 'Active' | 'Inactive' | 'Pending' | null;
  client_date_of_birth: string | null;
  client_gender: string | null;
  client_address: string | null;
  client_city: string | null;
  client_state: string | null;
  client_zipcode: string | null;
}

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log('🚀 [EMERGENCY DEBUG] AuthProvider component rendering');

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [authError, setAuthError] = useState<Error | null>(null);

  console.log('🚀 [EMERGENCY DEBUG] AuthProvider state initialized');

  const fetchClientProfile = async (userId: string): Promise<ClientProfile | null> => {
    try {
      console.log('🚀 [EMERGENCY DEBUG] Fetching client profile for user:', userId);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('client_id', userId)
        .single();

      if (error) {
        console.warn('⚠️ [EMERGENCY DEBUG] No client profile found (this is normal for non-client users)');
        return null;
      }

      console.log('🚀 [EMERGENCY DEBUG] Client profile fetched successfully');
      return data;
    } catch (error) {
      console.error('❌ [EMERGENCY DEBUG] Error fetching client profile:', error);
      return null;
    }
  };

  const refreshUserData = async (): Promise<void> => {
    try {
      console.log('🚀 [EMERGENCY DEBUG] Refreshing user data...');
      setIsLoading(true);
      
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ [EMERGENCY DEBUG] Error getting current user:', error);
        throw error;
      }

      if (currentUser) {
        console.log('🚀 [EMERGENCY DEBUG] Current user found, updating state');
        setUser(currentUser);
        setUserRole(currentUser.user_metadata?.role || null);
        
        const profile = await fetchClientProfile(currentUser.id);
        setClientProfile(profile);
        setAuthState('authenticated');
      } else {
        console.log('🚀 [EMERGENCY DEBUG] No current user found');
        setUser(null);
        setUserRole(null);
        setClientProfile(null);
        setAuthState('unauthenticated');
      }
    } catch (error) {
      console.error('❌ [EMERGENCY DEBUG] Error refreshing user data:', error);
      setAuthError(error as Error);
      setAuthState('error');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('🚀 [EMERGENCY DEBUG] Logging out user...');
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ [EMERGENCY DEBUG] Logout error:', error);
        throw error;
      }

      console.log('🚀 [EMERGENCY DEBUG] Logout successful');
      setUser(null);
      setUserRole(null);
      setClientProfile(null);
      setAuthState('unauthenticated');
    } catch (error) {
      console.error('❌ [EMERGENCY DEBUG] Error during logout:', error);
      setAuthError(error as Error);
      setAuthState('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize authentication
  useEffect(() => {
    console.log('🚀 [EMERGENCY DEBUG] AuthProvider useEffect - Setting up auth initialization');
    
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🚀 [EMERGENCY DEBUG] Starting auth initialization...');
        
        // Set authInitialized immediately to prevent blocking
        setAuthInitialized(true);
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ [EMERGENCY DEBUG] Error getting initial session:', error);
          if (mounted) {
            setAuthError(error);
            setAuthState('error');
            setIsLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          console.log('🚀 [EMERGENCY DEBUG] Initial session found, setting user data');
          setUser(session.user);
          setUserRole(session.user.user_metadata?.role || null);
          
          try {
            const profile = await fetchClientProfile(session.user.id);
            if (mounted) {
              setClientProfile(profile);
            }
          } catch (profileError) {
            console.warn('⚠️ [EMERGENCY DEBUG] Error fetching client profile during init:', profileError);
          }
          
          if (mounted) {
            setAuthState('authenticated');
          }
        } else {
          console.log('🚀 [EMERGENCY DEBUG] No initial session found');
          if (mounted) {
            setAuthState('unauthenticated');
          }
        }
      } catch (error) {
        console.error('❌ [EMERGENCY DEBUG] Error in auth initialization:', error);
        if (mounted) {
          setAuthError(error as Error);
          setAuthState('error');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('🚀 [EMERGENCY DEBUG] Auth state change event:', event);
        
        if (!mounted) return;

        try {
          if (session?.user) {
            console.log('🚀 [EMERGENCY DEBUG] Auth state change - user signed in');
            setUser(session.user);
            setUserRole(session.user.user_metadata?.role || null);
            
            try {
              const profile = await fetchClientProfile(session.user.id);
              setClientProfile(profile);
            } catch (profileError) {
              console.warn('⚠️ [EMERGENCY DEBUG] Error fetching client profile on auth change:', profileError);
            }
            
            setAuthState('authenticated');
          } else {
            console.log('🚀 [EMERGENCY DEBUG] Auth state change - user signed out');
            setUser(null);
            setUserRole(null);
            setClientProfile(null);
            setAuthState('unauthenticated');
          }
        } catch (error) {
          console.error('❌ [EMERGENCY DEBUG] Error handling auth state change:', error);
          setAuthError(error as Error);
          setAuthState('error');
        }
      }
    );

    // Initialize
    initializeAuth();

    // Cleanup
    return () => {
      console.log('🚀 [EMERGENCY DEBUG] AuthProvider cleanup');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
    hasUser: !!user,
    userRole,
    isLoading,
    authInitialized,
    authState
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('❌ [EMERGENCY DEBUG] useAuth must be used within an AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
