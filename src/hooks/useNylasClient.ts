
import { useMemo } from 'react';
import Nylas from 'nylas';
import { useAuth } from './useAuth';

export function useNylasClient() {
  const { isAuthenticated } = useAuth();
  
  return useMemo(() => {
    if (!isAuthenticated) return null;
    
    // v7 SDK initialization with API key
    const nylas = new Nylas({
      apiKey: 'nyk_v0_S9OozobUDThXIF9vKpAliyo1ojSNANr3Tq00uvwYjPbuCWNWoILXRSGvxUvB8DSG',
      apiUri: 'https://api.us.nylas.com'
    });
    
    return nylas;
  }, [isAuthenticated]);
}
