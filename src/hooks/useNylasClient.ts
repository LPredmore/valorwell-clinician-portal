
import { useMemo } from 'react';
import Nylas from 'nylas';
import { useAuth } from './useAuth';

export function useNylasClient() {
  const { isAuthenticated } = useAuth();
  
  return useMemo(() => {
    if (!isAuthenticated) return null;
    
    // Use the Nylas credentials from your custom instructions
    return Nylas.with({
      clientId: '51e0429b-2859-4aed-9a8d-d9612d529853',
      clientSecret: 'nyk_v0_S9OozobUDThXIF9vKpAliyo1ojSNANr3Tq00uvwYjPbuCWNWoILXRSGvxUvB8DSG'
    });
  }, [isAuthenticated]);
}
