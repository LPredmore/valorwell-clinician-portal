import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';

export const useGoogleCalendar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsConnected(!!session?.provider_token);
      } catch (err) {
        console.error('Error checking Google Calendar connection:', err);
      }
    };
    checkConnection();
  }, []);

  const connectGoogleCalendar = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Start Google OAuth flow
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'https://www.googleapis.com/auth/calendar',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (authError) throw authError;

      // The actual token will be available after redirect in the session
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Google Calendar');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setIsConnected(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Google Calendar');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isConnected,
    isLoading,
    error,
    connectGoogleCalendar,
    disconnectGoogleCalendar
  };
};