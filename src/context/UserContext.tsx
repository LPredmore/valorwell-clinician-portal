import React, { createContext, useContext } from 'react';
import { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useAuth, ClientProfile, AuthState } from './AuthProvider';

/**
 * COMPATIBILITY LAYER
 * 
 * This file provides backward compatibility with existing code that uses UserContext.
 * It re-exports the functionality from AuthProvider with the same interface.
 * New code should use AuthProvider directly.
 */

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
  authState: AuthState;
  authError: Error | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  
  return (
    <UserContext.Provider value={auth}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider or AuthProvider');
  }
  return context;
};

export { ClientProfile, AuthState };
