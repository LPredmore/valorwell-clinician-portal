import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types/client'; // Import the unified Client type

// Types for client profile (matching main clients table) - REMOVED, using Client from types/client.ts

type AuthState = 'initializing' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextType {
  user: SupabaseUser | null;
  userId: string | null;
  userRole: string | null;
  clientProfile: Client | null; // Use Client type
  clientStatus: Client['client_status'] | null; // Use Client type
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
  const [clientProfile, setClientProfile] = useState<Client | null>(null);
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

  const fetchClientProfile = async (userId: string): Promise<Client | null> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*') // Fetch all fields for the comprehensive Client type
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching client profile:', error);
        return null;
      }
      return data as Client;
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
