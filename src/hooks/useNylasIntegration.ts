
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

export const useNylasIntegration = () => {
  const [connections, setConnections] = useState<NylasConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [infrastructureError, setInfrastructureError] = useState<string | null>(null);
  const { toast } = useToast();
  const { userId, authInitialized } = useUser();

  // Listen for callback success messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NYLAS_AUTH_SUCCESS') {
        console.log('[useNylasIntegration] Received Google Calendar auth success message');
        setIsConnecting(false);
        toast({
          title: 'Google Calendar Connected',
          description: 'Successfully connected your Google Calendar via Nylas',
          variant: 'default'
        });
        // Refresh connections
        fetchConnections();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Fetch user's calendar connections
  const fetchConnections = async () => {
    if (!authInitialized || !userId) {
      console.log('[useNylasIntegration] Skipping fetch - auth not ready or no user');
      return;
    }

    try {
      setIsLoading(true);
      setInfrastructureError(null);
      console.log('[useNylasIntegration] Fetching connections for user:', userId);
      
      const { data, error } = await supabase
        .from('nylas_connections')
        .select('id, email, provider, is_active, created_at, calendar_ids, connector_id, grant_status, scopes, last_sync_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useNylasIntegration] Database error:', error);
        
        if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
          setInfrastructureError('Database permissions not configured. Please apply the RLS migration.');
          toast({
            title: 'Setup Required',
            description: 'Calendar integration requires database migration. Please contact support.',
            variant: 'destructive'
          });
        } else if (error.message?.includes('does not exist')) {
          setInfrastructureError('Database tables missing. Please apply Nylas migrations.');
          toast({
            title: 'Database Setup Required',
            description: 'Nylas tables are missing. Please apply migrations.',
            variant: 'destructive'
          });
        } else {
          setInfrastructureError(`Database error: ${error.message}`);
          throw error;
        }
        return;
      }

      console.log('[useNylasIntegration] Fetched connections:', data);
      setConnections(data || []);
    } catch (error: any) {
      console.error('[useNylasIntegration] Error fetching connections:', error);
      setInfrastructureError(`Failed to load connections: ${error.message}`);
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
      toast({
        title: 'Authentication Required',
        description: 'Please log in to connect Google Calendar',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsConnecting(true);
      setInfrastructureError(null);
      console.log('[useNylasIntegration] Initializing Google Calendar connection via Nylas');

      const { data, error } = await supabase.functions.invoke('nylas-auth', {
        body: { action: 'initialize' }
      });

      if (error) {
        console.error('[useNylasIntegration] Function error:', error);
        
        if (error.message?.includes('Failed to send a request') || error.message?.includes('does not exist')) {
          setInfrastructureError('Edge function not deployed. Please deploy nylas-auth function.');
          toast({
            title: 'Infrastructure Required',
            description: 'Nylas edge functions need to be deployed. Please contact support.',
            variant: 'destructive'
          });
        } else {
          setInfrastructureError(`Connection error: ${error.message}`);
          throw error;
        }
        return;
      }

      if (data?.authUrl) {
        console.log('[useNylasIntegration] Opening Google OAuth window via Nylas');
        const popup = window.open(
          data.authUrl,
          'google-calendar-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Monitor popup closure (in case user closes without completing auth)
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            // Only set connecting to false if we haven't received a success message
            setTimeout(() => {
              setIsConnecting(false);
            }, 1000);
          }
        }, 1000);
      } else {
        setInfrastructureError('No authorization URL received from server');
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      console.error('[useNylasIntegration] Error connecting Google Calendar:', error);
      setInfrastructureError(`Connection failed: ${error.message}`);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to initialize Google Calendar connection',
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
        if (error.message?.includes('Failed to send a request')) {
          setInfrastructureError('Edge function not available for disconnect');
          toast({
            title: 'Infrastructure Error',
            description: 'Cannot disconnect - edge functions not deployed',
            variant: 'destructive'
          });
        }
        throw error;
      }

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

  useEffect(() => {
    if (authInitialized && userId) {
      fetchConnections();
    }
  }, [authInitialized, userId]);

  return {
    connections,
    isLoading,
    isConnecting,
    infrastructureError,
    connectCalendar: connectGoogleCalendar, // Renamed for clarity
    connectGoogleCalendar,
    disconnectCalendar,
    refreshConnections: fetchConnections
  };
};
