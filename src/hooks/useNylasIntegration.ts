
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import { useNylasClient } from './useNylasClient';

interface NylasConnection {
  id: string;
  grant_id?: string;
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

interface NylasCalendar {
  id: string;
  name: string;
  isPrimary: boolean;
  readOnly: boolean;
}

export const useNylasIntegration = () => {
  const [connections, setConnections] = useState<NylasConnection[]>([]);
  const [calendars, setCalendars] = useState<NylasCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [infrastructureError, setInfrastructureError] = useState<string | null>(null);
  const { toast } = useToast();
  const { userId, authInitialized } = useUser();
  const nylasClient = useNylasClient();

  // Listen for callback success and error messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NYLAS_AUTH_SUCCESS') {
        console.log('[useNylasIntegration] Received Google Calendar auth success message:', {
          email: event.data.email,
          grant_id: event.data.grant_id
        });
        setIsConnecting(false);
        toast({
          title: 'Google Calendar Connected',
          description: `Successfully connected ${event.data.email} via Nylas`,
          variant: 'default'
        });
        fetchConnections();
      } else if (event.data?.type === 'NYLAS_AUTH_ERROR') {
        console.log('[useNylasIntegration] Received Google Calendar auth error message:', event.data.error);
        setIsConnecting(false);
        toast({
          title: 'Connection Failed',
          description: `Google Calendar connection failed: ${event.data.error}`,
          variant: 'destructive'
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Fetch calendars directly with Nylas SDK
  const fetchCalendars = async () => {
    if (!nylasClient || !connections.length) {
      setCalendars([]);
      return;
    }

    try {
      console.log('[useNylasIntegration] Fetching calendars with Nylas SDK');
      const allCalendars: NylasCalendar[] = [];

      for (const connection of connections) {
        try {
          const calendarsResponse = await nylasClient.calendars.list({
            grantId: connection.grant_id || connection.id
          });

          const connectionCalendars = (calendarsResponse.data || []).map(cal => ({
            id: cal.id,
            name: cal.name || 'Unnamed Calendar',
            isPrimary: cal.isPrimary || false,
            readOnly: cal.readOnly || false
          }));

          allCalendars.push(...connectionCalendars);
        } catch (error) {
          console.error(`[useNylasIntegration] Error fetching calendars for connection ${connection.id}:`, error);
        }
      }

      console.log(`[useNylasIntegration] Fetched ${allCalendars.length} calendars`);
      setCalendars(allCalendars);
    } catch (error) {
      console.error('[useNylasIntegration] Error fetching calendars:', error);
    }
  };

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
        .select('id, grant_id, email, provider, is_active, created_at, calendar_ids, scopes, token_expires_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useNylasIntegration] Database error:', error);
        
        // Handle specific error cases
        if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
          setInfrastructureError('Database permissions not configured. Please apply the latest migration.');
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
          console.error('[useNylasIntegration] Detailed error:', error);
        }
        return;
      }

      console.log('[useNylasIntegration] Fetched connections:', data?.map(conn => ({
        id: conn.id,
        grant_id: conn.grant_id,
        email: conn.email,
        provider: conn.provider
      })));
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
        } else if (error.message?.includes('Nylas configuration missing')) {
          setInfrastructureError('Nylas API credentials not configured. Please set NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET, and NYLAS_API_KEY.');
          toast({
            title: 'Configuration Required',
            description: 'Nylas API credentials need to be configured in Supabase secrets.',
            variant: 'destructive'
          });
        } else {
          setInfrastructureError(`Connection error: ${error.message}`);
          toast({
            title: 'Connection Failed',
            description: error.message || 'Failed to initialize connection',
            variant: 'destructive'
          });
        }
        setIsConnecting(false);
        return;
      }

      if (data?.authUrl) {
        console.log('[useNylasIntegration] Opening Google OAuth window via Nylas');
        const popup = window.open(
          data.authUrl,
          'google-calendar-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes,popup=yes'
        );

        if (!popup) {
          setInfrastructureError('Popup blocked. Please allow popups for this site.');
          toast({
            title: 'Popup Blocked',
            description: 'Please allow popups and try again.',
            variant: 'destructive'
          });
          setIsConnecting(false);
          return;
        }

        // Monitor popup closure without message (user closed manually)
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            // Only set connecting to false if we didn't receive a message
            setTimeout(() => {
              setIsConnecting(false);
            }, 1000);
          }
        }, 1000);

        // Cleanup interval after 5 minutes
        setTimeout(() => {
          clearInterval(checkClosed);
          if (popup && !popup.closed) {
            popup.close();
          }
          setIsConnecting(false);
        }, 300000);
      } else {
        setInfrastructureError('No authorization URL received from server');
        setIsConnecting(false);
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

  // Disconnect calendar with proper grant revocation
  const disconnectCalendar = async (connectionId: string) => {
    try {
      console.log('[useNylasIntegration] Disconnecting calendar:', connectionId);
      
      const { data, error } = await supabase.functions.invoke('nylas-auth', {
        body: {
          action: 'disconnect',
          connectionId
        }
      });

      if (error) {
        console.error('[useNylasIntegration] Disconnect error:', error);
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

      console.log('[useNylasIntegration] Disconnect successful:', data);
      toast({
        title: 'Calendar Disconnected',
        description: data?.message || 'Calendar has been successfully disconnected'
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

  // Fetch calendars when connections change
  useEffect(() => {
    if (connections.length > 0) {
      fetchCalendars();
    }
  }, [nylasClient, connections.length]);

  useEffect(() => {
    if (authInitialized && userId) {
      fetchConnections();
    }
  }, [authInitialized, userId]);

  return {
    connections,
    calendars,
    isLoading,
    isConnecting,
    infrastructureError,
    connectCalendar: connectGoogleCalendar,
    connectGoogleCalendar,
    disconnectCalendar,
    refreshConnections: fetchConnections,
    fetchCalendars
  };
};
