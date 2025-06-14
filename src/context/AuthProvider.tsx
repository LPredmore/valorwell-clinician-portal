import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Types for client profile (matching main clients table)
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

type AuthState = 'initializing' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextType {
  user: SupabaseUser | null;
  userId: string | null;
  userRole: string | null;
  clientProfile: ClientProfile | null;
  clientStatus: ClientProfile['client_status'] | null;
  isLoading: boolean;
  authInitialized: boolean;
  authState: AuthState;
  authError: Error | null;
  refreshUserData: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authState, setAuthState] = useState<AuthState>('initializing');
  const [authError, setAuthError] = useState<Error | null>(null);

  const clearState = () => {
    setUser(null);
    setUserRole(null);
    setClientProfile(null);
    setIsLoading(false);
    setAuthState('unauthenticated');
    setAuthInitialized(true);
  };

  const fetchClientProfile = async (userId: string): Promise<ClientProfile | null> => {
    try {
      // FIX: Use correct Supabase aliasing `new_name:column_name` instead of SQL `AS`
      const { data, error } = await supabase
        .from('clients')
        .select(
          'client_id:id, client_first_name:first_name, client_last_name:last_name, client_preferred_name:preferred_name, client_email:email, client_phone:phone, client_status:status, client_date_of_birth:date_of_birth, client_age:age, client_gender:gender, client_address:address, client_city:city, client_state:state, client_zipcode:zipcode'
        )
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching client profile:', error);
        return null;
      }
      return data as ClientProfile;
    } catch (e) {
      console.error('Exception while fetching client profile:', e);
      return null;
    }
  };

  const refreshUserData = async () => {
    setIsLoading(true);
    setAuthState('initializing');
    setAuthError(null);
    // Triggers useEffect below to recheck
    await checkSession();
  };

  const logout = async () => {
    setIsLoading(true);
    setAuthError(null);
    await supabase.auth.signOut();
    clearState();
  };

  const checkSession = async () => {
    setIsLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        clearState();
        return;
      }
      setUser(session.user);
      setUserRole(session.user.user_metadata?.role || null);
      setAuthState('authenticated');
      setIsLoading(false);
      setAuthInitialized(true);

      // Only try to fetch client profile for client users
      if (session.user.user_metadata?.role === 'client') {
        const profile = await fetchClientProfile(session.user.id);
        setClientProfile(profile || null);
      } else {
        setClientProfile(null);
      }
    } catch (e: any) {
      setAuthError(e);
      setAuthState('error');
      setIsLoading(false);
      setAuthInitialized(true);
    }
  };

  useEffect(() => {
    checkSession();
    // Auth change handler
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setUserRole(session.user.user_metadata?.role || null);
        setAuthState('authenticated');
        setAuthInitialized(true);
        setIsLoading(false);
        if (session.user.user_metadata?.role === 'client') {
          const profile = await fetchClientProfile(session.user.id);
          setClientProfile(profile); // profile can be null, which is handled
        } else {
          setClientProfile(null);
        }
      } else {
        clearState();
      }
    });
    return () => { listener.subscription?.unsubscribe(); };
    // eslint-disable-next-line
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.id || null,
        userRole,
        clientProfile,
        clientStatus: clientProfile?.client_status || null,
        isLoading,
        authInitialized,
        authState,
        authError,
        refreshUserData,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
