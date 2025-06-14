
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthProvider';
import { TimeZoneService } from '@/utils/timeZoneService';
import { NylasConnection, DetailedError, NylasErrorType } from '@/types/nylas';

interface UseNylasAuthFlowProps {
  connections: NylasConnection[];
  setConnections: React.Dispatch<React.SetStateAction<NylasConnection[]>>;
  refreshConnections: (force?: boolean) => Promise<void>;
  setLastError: (error: DetailedError | null) => void;
  categorizeError: (error: any, context: string) => DetailedError;
  clearError: () => void;
}

export const useNylasAuthFlow = ({
  connections,
  setConnections,
  refreshConnections,
  setLastError,
  categorizeError,
  clearError,
}: UseNylasAuthFlowProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const { userId, authInitialized } = useAuth();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data?.type === 'NYLAS_AUTH_SUCCESS') {
          console.log('[useNylasIntegration] Received Google Calendar auth success message');
          setIsConnecting(false);
          setLastError(null);
          toast({ title: 'Google Calendar Connected', description: 'Successfully connected your Google Calendar via Nylas', variant: 'default' });
          setTimeout(() => refreshConnections(true), 1000);
        } else if (event.data?.type === 'NYLAS_AUTH_ERROR') {
          console.error('[useNylasIntegration] Received OAuth error:', event.data.error);
          const errorDetails: DetailedError = { type: NylasErrorType.OAUTH, message: 'Calendar authorization failed', details: event.data.error?.message || 'OAuth flow returned an error', actionRequired: 'Please try again or contact support', retryable: true, originalError: event.data.error };
          setLastError(errorDetails);
          setIsConnecting(false);
          toast({ title: 'Calendar Connection Failed', description: errorDetails.message, variant: 'destructive' });
        }
      } catch (error) {
        console.error('[useNylasIntegration] Error handling message event:', error);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast, refreshConnections, setLastError]);

  const connectGoogleCalendar = useCallback(async () => {
    clearError();
    
    if (!authInitialized || !userId) {
      const error: DetailedError = { type: NylasErrorType.OAUTH, message: 'Authentication required', details: 'User must be logged in to connect calendar', actionRequired: 'Please log in first', retryable: false };
      setLastError(error);
      toast({ title: 'Authentication Required', description: 'Please log in to connect Google Calendar', variant: 'destructive' });
      return;
    }

    try {
      setIsConnecting(true);
      setLastError(null);
      console.log('[useNylasIntegration] Initializing Google Calendar connection via Nylas');

      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<{data: null, error: DetailedError}>((_, reject) => {
        timeoutId = setTimeout(() => reject({ data: null, error: { type: NylasErrorType.TIMEOUT, message: 'Request timed out while initializing calendar connection', details: 'The server took too long to respond', actionRequired: 'Try again later', retryable: true } }), 15000);
      });
      
      const result = await Promise.race([
        supabase.functions.invoke('nylas-auth', { body: { action: 'initialize', timezone: TimeZoneService.ensureIANATimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) } }),
        timeoutPromise
      ]);
      clearTimeout(timeoutId);
      
      const { data, error } = result;

      if (error) throw error;

      if (data?.authUrl) {
        console.log('[useNylasIntegration] Opening Google OAuth window via Nylas');
        const popup = window.open(data.authUrl, 'google-calendar-auth', 'width=500,height=600,scrollbars=yes,resizable=yes');
        if (!popup) {
           throw new Error('Popup blocked');
        }
        const checkClosed = setInterval(() => {
          try {
            if (popup?.closed) {
              clearInterval(checkClosed);
              setTimeout(() => {
                if (isConnecting) {
                  setIsConnecting(false);
                  if (!connections.some(conn => conn.provider === 'google')) {
                    toast({ title: 'Connection Cancelled', description: 'Calendar connection was cancelled or unsuccessful', variant: 'default' });
                  }
                }
              }, 1000);
            }
          } catch (e) {
            console.error('[useNylasIntegration] Error checking popup state:', e);
            clearInterval(checkClosed);
            setIsConnecting(false);
          }
        }, 1000);
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      const categorizedError = categorizeError(error.message.includes('Popup blocked') ? { type: NylasErrorType.OAUTH, message: 'Popup blocked', details: 'Browser blocked the popup window', actionRequired: 'Allow popups for this site and try again', retryable: true } : error, 'OAuth initialization');
      setLastError(categorizedError);
      toast({ title: 'Connection Failed', description: categorizedError.message, variant: 'destructive' });
      setIsConnecting(false);
    }
  }, [authInitialized, userId, isConnecting, connections, categorizeError, toast, setLastError, clearError]);

  const disconnectCalendar = useCallback(async (connectionId: string) => {
    try {
      console.log('[useNylasIntegration] Disconnecting calendar:', connectionId);
      
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<{data: null, error: DetailedError}>((_, reject) => {
        timeoutId = setTimeout(() => reject({ data: null, error: { type: NylasErrorType.TIMEOUT, message: 'Request timed out while disconnecting calendar', details: 'The server took too long to respond', actionRequired: 'Try again later', retryable: true } }), 10000);
      });
      
      const { error } = await Promise.race([
        supabase.functions.invoke('nylas-auth', { body: { action: 'disconnect', connectionId } }),
        timeoutPromise
      ]);
      clearTimeout(timeoutId!);
      
      if (error) throw error;

      setLastError(null);
      toast({ title: 'Calendar Disconnected', description: 'Google Calendar has been successfully disconnected' });
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      setTimeout(() => refreshConnections(true), 500);
    } catch (error: any) {
      console.error('[useNylasIntegration] Error disconnecting calendar:', error);
      const categorizedError = categorizeError(error, 'disconnect');
      setLastError(categorizedError);
      toast({ title: 'Disconnection Failed', description: categorizedError.message, variant: 'destructive' });
    }
  }, [categorizeError, refreshConnections, toast, setLastError, setConnections]);

  return { isConnecting, connectGoogleCalendar, disconnectCalendar };
};
