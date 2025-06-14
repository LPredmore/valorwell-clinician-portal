
/**
 * COMPATIBILITY LAYER
 *
 * This file provides backward compatibility with existing code that uses UserContext.
 * It re-exports the functionality from AuthProvider with the same interface.
 * New code should use AuthProvider directly.
 */

import React, { createContext, useContext } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useAuth, ClientProfile, AuthState } from './AuthProvider';

// Define UserContext type that matches the updated AuthProvider
interface UserContextType {
  user: SupabaseUser | null;
  userId: string | null;
  userRole: string | null;
  clientStatus: ClientProfile['client_status'] | null;
  clientProfile: ClientProfile | null;
  isLoading: boolean;
  authInitialized: boolean;
  refreshUserData: () => void;
  logout: () => Promise<void>;
  authState: AuthState;
  authError: Error | null;
}

// Create context with the same shape as AuthContext
const UserContext = createContext<UserContextType | undefined>(undefined);

// UserProvider is now a simple wrapper around AuthProvider
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get auth context from AuthProvider
  const auth = useAuth();
  
  // Create a compatible value object
  const value: UserContextType = {
    ...auth
  };
  
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// useUser hook provides the same interface as useAuth
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider or AuthProvider');
  }
  return context;
};

// Re-export types from AuthProvider
export type { ClientProfile, AuthState };
