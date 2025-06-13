
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';

interface NylasConnection {
  id: string;
  email: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  calendar_ids?: string[];
  connector_id?: string;
  grant_status?: string;
  scopes?: string[];
  last_sync_at?: string;
}

interface DetailedError {
  type: 'database' | 'edge_function' | 'oauth' | 'configuration' | 'unknown';
  message: string;
  details?: string;
  actionRequired?: string;
}

export const useNylasIntegration = () => {
  const [connections, setConnections] = useState<NylasConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<DetailedError | null>(null);
  const { toast } = useToast();
  const { userId, authInitialized } = useUser();

  // Listen for callback success messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NYLAS_AUTH_SUCCESS') {
        console.log('[useNylasIntegration] Received Google Calendar auth success message');
        setIsConnecting(false);
        setLastError(null);
        toast({
          title: 'Google Calendar Connected',
          description: 'Successfully connected your Google Calendar via Nylas',
          variant: 'default'
        });
        fetchConnections();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Enhanced error categorization
  const categorizeError = (error: any, context: string): DetailedError => {
    console.error(`[useNylasIntegration] ${context} error:`, error);

    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    // Database errors
    if (error.code === 'PGRST301' || errorMessage.includes('permission denied')) {
      return {
        type: 'database',
        message: 'Database permission denied',
        details: 'RLS policies may not be configured correctly',
        actionRequired: 'Run database migration to fix RLS policies'
      };
    }

    if (errorMessage.includes('does not exist') && context === 'database') {
      return {
        type: 'database',
        message: 'Database tables missing',
        details: 'Nylas tables do not exist',
        actionRequired: 'Apply Nylas database migration'
      };
    }

    // Edge function errors
    if (errorMessage.includes('Failed to send a request') || errorMessage.includes('does not exist')) {
      return {
        type: 'edge_function',
        message: 'Edge function not available',
        details: 'nylas-auth function is not deployed',
        actionRequired: 'Deploy nylas-auth edge function'
      };
    }

    if (errorMessage.includes('Nylas configuration missing')) {
      return {
        type: 'configuration',
        message: 'Nylas credentials missing',
        details: 'API credentials not configured in Supabase secrets',
        actionRequired: 'Set NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET, NYLAS_API_KEY in Supabase secrets'
      };
    }

    // OAuth errors
    if (errorMessage.includes('authorization') || errorMessage.includes('oauth')) {
      return {
        type: 'oauth',
        message: 'OAuth authorization failed',
        details: errorMessage,
        actionRequired: 'Check OAuth configuration and redirect URLs'
      };
    }

    // Default categorization
    return {
      type: 'unknown',
      message: `${context} failed`,
      details: errorMessage,
      actionRequired: 'Check logs for more details'
    };
  };

  // Fetch user's calendar connections
  const fetchConnections = async () => {
    if (!authInitialized || !userId) {
      console.log('[useNylasIntegration] Skipping fetch - auth not ready or no user');
      return;
    }

    try {
      setIsLoading(true);
      setLastError(null);
      console.log('[useNylasIntegration] Fetching connections for user:', userId);
      
      const { data, error } = await supabase
        .from('nylas_connections')
        .select('id, email, provider, is_active, created_at, calendar_ids, connector_id, grant_status, scopes, last_sync_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        const categorizedError = categorizeError(error, 'database');
        setLastError(categorizedError);
        
        toast({
          title: 'Database Error',
          description: categorizedError.message,
          variant: 'destructive'
        });
        return;
      }

      console.log('[useNylasIntegration] Fetched connections:', data);
      setConnections(data || []);
    } catch (error: any) {
      const categorizedError = categorizeError(error, 'connection fetch');
      setLastError(categorizedError);
      
      toast({
        title: 'Error',
        description: 'Failed to load calendar connections',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Google Calendar connection via Nylas
  const connectGoogleCalendar = async () => {
    if (!authInitialized || !userId) {
      const error = {
        type: 'oauth' as const,
        message: 'Authentication required',
        details: 'User must be logged in to connect calendar',
        actionRequired: 'Please log in first'
      };
      setLastError(error);
      toast({
        title: 'Authentication Required',
        description: 'Please log in to connect Google Calendar',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsConnecting(true);
      setLastError(null);
      console.log('[useNylasIntegration] Initializing Google Calendar connection via Nylas');

      const { data, error } = await supabase.functions.invoke('nylas-auth', {
        body: { action: 'initialize' }
      });

      if (error) {
        const categorizedError = categorizeError(error, 'edge function');
        setLastError(categorizedError);
        
        toast({
          title: 'Connection Failed',
          description: categorizedError.message,
          variant: 'destructive'
        });
        return;
      }

      if (data?.authUrl) {
        console.log('[useNylasIntegration] Opening Google OAuth window via Nylas');
        const popup = window.open(
          data.authUrl,
          'google-calendar-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          const error = {
            type: 'oauth' as const,
            message: 'Popup blocked',
            details: 'Browser blocked the popup window',
            actionRequired: 'Allow popups for this site and try again'
          };
          setLastError(error);
          toast({
            title: 'Popup Blocked',
            description: 'Please allow popups and try again.',
            variant: 'destructive'
          });
          return;
        }

        // Monitor popup closure
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setTimeout(() => {
              setIsConnecting(false);
            }, 1000);
          }
        }, 1000);
      } else {
        const error = {
          type: 'edge_function' as const,
          message: 'No authorization URL received',
          details: 'Edge function did not return auth URL',
          actionRequired: 'Check edge function logs'
        };
        setLastError(error);
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      const categorizedError = categorizeError(error, 'OAuth initialization');
      setLastError(categorizedError);
      
      toast({
        title: 'Connection Failed',
        description: categorizedError.message,
        variant: 'destructive'
      });
      setIsConnecting(false);
    }
  };

  // Disconnect calendar
  const disconnectCalendar = async (connectionId: string) => {
    try {
      console.log('[useNylasIntegration] Disconnecting calendar:', connectionId);
      
      const { error } = await supabase.functions.invoke('nylas-auth', {
        body: {
          action: 'disconnect',
          connectionId
        }
      });

      if (error) {
        const categorizedError = categorizeError(error, 'disconnect');
        setLastError(categorizedError);
        throw error;
      }

      setLastError(null);
      toast({
        title: 'Calendar Disconnected',
        description: 'Google Calendar has been successfully disconnected'
      });

      fetchConnections();
    } catch (error: any) {
      console.error('[useNylasIntegration] Error disconnecting calendar:', error);
      toast({
        title: 'Disconnection Failed',
        description: error.message || 'Failed to disconnect calendar',
        variant: 'destructive'
      });
    }
  };

  // Clear error state
  const clearError = () => {
    setLastError(null);
  };

  useEffect(() => {
    if (authInitialized && userId) {
      fetchConnections();
    }
  }, [authInitialized, userId]);

  return {
    connections,
    isLoading,
    isConnecting,
    lastError,
    clearError,
    connectCalendar: connectGoogleCalendar,
    connectGoogleCalendar,
    disconnectCalendar,
    refreshConnections: fetchConnections,
    // Legacy compatibility
    infrastructureError: lastError?.message || null
  };
};
